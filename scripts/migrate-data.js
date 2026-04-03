const { prisma } = require("../src/db/prisma");
const admin = require("firebase-admin");
const { readFileSync } = require("fs");

// Initialize Firebase Admin
// Make sure to set GOOGLE_APPLICATION_CREDENTIALS or have firebase-adminsdk.json in place
const serviceAccount = JSON.parse(readFileSync("./firebase-adminsdk.json", "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrate() {
  console.log("Starting migration...");

  // 1. Migrate Users
  const usersSnapshot = await admin.auth().listUsers();
  console.log(`Found ${usersSnapshot.users.length} users in Firebase Auth`);

  for (const fbUser of usersSnapshot.users) {
    console.log(`Migrating user: ${fbUser.email}`);
    await prisma.user.upsert({
      where: { email: fbUser.email },
      update: {
        id: fbUser.uid,
        name: fbUser.displayName,
        image: fbUser.photoURL,
      },
      create: {
        id: fbUser.uid,
        email: fbUser.email,
        name: fbUser.displayName,
        image: fbUser.photoURL,
        // Password hash will be missing for Google users or needs to be set manually for email users
        // Since we are switching to Credentials, we might need users to reset passwords or set a temp one
      },
    });
  }

  // 2. Migrate Lists
  const listsSnapshot = await db.collection("lists").get();
  console.log(`Found ${listsSnapshot.size} lists`);

  for (const listDoc of listsSnapshot.docs) {
    const data = listDoc.data();
    console.log(`Migrating list: ${data.name}`);

    await prisma.list.upsert({
      where: { id: listDoc.id },
      update: {
        name: data.name,
        isArchived: data.isArchived || false,
        createdDate: data.createdDate.toDate(),
        ownerID: data.ownerID,
      },
      create: {
        id: listDoc.id,
        name: data.name,
        isArchived: data.isArchived || false,
        createdDate: data.createdDate.toDate(),
        ownerID: data.ownerID,
      },
    });

    // Handle contributors (Many-to-Many)
    if (data.contributors && Array.isArray(data.contributors)) {
      for (const contributorId of data.contributors) {
        try {
          await prisma.list.update({
            where: { id: listDoc.id },
            data: {
              contributors: {
                connect: { id: contributorId }
              }
            }
          });
        } catch (e) {
          console.warn(`Could not connect contributor ${contributorId} to list ${listDoc.id}`);
        }
      }
    }

    // 3. Migrate Sections
    const sectionsSnapshot = await listDoc.ref.collection("sections").get();
    for (const sectionDoc of sectionsSnapshot.docs) {
      const sData = sectionDoc.data();
      await prisma.section.upsert({
        where: { id: sectionDoc.id },
        update: {
          name: sData.name,
          createdDate: sData.createdDate ? sData.createdDate.toDate() : new Date(),
          listId: listDoc.id,
        },
        create: {
          id: sectionDoc.id,
          name: sData.name,
          createdDate: sData.createdDate ? sData.createdDate.toDate() : new Date(),
          listId: listDoc.id,
        },
      });

      // Migrate items in section
      const sectionItemsSnapshot = await sectionDoc.ref.collection("items").get();
      for (const itemDoc of sectionItemsSnapshot.docs) {
        const iData = itemDoc.data();
        await prisma.item.upsert({
          where: { id: itemDoc.id },
          update: {
            name: iData.name,
            completed: iData.completed || false,
            description: iData.description || "",
            createdDate: iData.createdDate ? iData.createdDate.toDate() : new Date(),
            order: iData.order || 0,
            listID: listDoc.id,
            sectionID: sectionDoc.id,
          },
          create: {
            id: itemDoc.id,
            name: iData.name,
            completed: iData.completed || false,
            description: iData.description || "",
            createdDate: iData.createdDate ? iData.createdDate.toDate() : new Date(),
            order: iData.order || 0,
            listID: listDoc.id,
            sectionID: sectionDoc.id,
          },
        });
      }
    }

    // 4. Migrate Items (Root items of the list)
    const rootItemsSnapshot = await listDoc.ref.collection("items").get();
    for (const itemDoc of rootItemsSnapshot.docs) {
      const iData = itemDoc.data();
      await prisma.item.upsert({
        where: { id: itemDoc.id },
        update: {
          name: iData.name,
          completed: iData.completed || false,
          description: iData.description || "",
          createdDate: iData.createdDate ? iData.createdDate.toDate() : new Date(),
          order: iData.order || 0,
          listID: listDoc.id,
          sectionID: null,
        },
        create: {
          id: itemDoc.id,
          name: iData.name,
          completed: iData.completed || false,
          description: iData.description || "",
          createdDate: iData.createdDate ? iData.createdDate.toDate() : new Date(),
          order: iData.order || 0,
          listID: listDoc.id,
          sectionID: null,
        },
      });
    }
  }

  // 5. Migrate Invites
  const invitesSnapshot = await db.collection("invites").get();
  for (const inviteDoc of invitesSnapshot.docs) {
    const invData = inviteDoc.data();
    await prisma.invite.upsert({
      where: { id: inviteDoc.id },
      update: {
        inviterID: invData.inviterID,
        inviterName: invData.inviterName,
        inviteeEmail: invData.inviteeEmail,
        listID: invData.listID,
        listName: invData.listName,
        status: invData.status,
        createdDate: invData.createdDate.toDate(),
      },
      create: {
        id: inviteDoc.id,
        inviterID: invData.inviterID,
        inviterName: invData.inviterName,
        inviteeEmail: invData.inviteeEmail,
        listID: invData.listID,
        listName: invData.listName,
        status: invData.status,
        createdDate: invData.createdDate.toDate(),
      },
    });
  }

  console.log("Migration completed!");
}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
