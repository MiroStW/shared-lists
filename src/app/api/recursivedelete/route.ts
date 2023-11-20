import { adminDb, firebaseAdmin } from "@firebase/firebaseAdmin";
import { adminAuth } from "auth/getServerSession";
import { firestore } from "firebase-admin";
import { Firestore } from "firebase-admin/firestore";
import { deleteDoc } from "firebase/firestore";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const POST = async (request: NextRequest) => {
  let uid; // user id

  const sessionCookie = cookies().get("__session")?.value;

  if (!sessionCookie) {
    return NextResponse.json({ message: "no token provided" }, { status: 200 });
  }

  // validate cookie
  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    uid = decodedToken.uid;
  } catch (error) {
    console.log("recursivedelete auth failed: ", error);
    return NextResponse.json({ message: error }, { status: 401 });
  }

  try {
    const { path } = await request.json();
    if (!path) {
      return NextResponse.json(
        { message: "no path provided" },
        { status: 200 }
      );
    }

    // Check if user owns the record
    try {
      const snapshot = await adminDb().doc(path).get();
      // const snapshot = await firestore(firebaseAdmin).doc(path).get();
      if (!snapshot) {
        return NextResponse.json(
          { message: "no record found" },
          { status: 200 }
        );
      }

      const ownerID = snapshot.get("ownerID");

      if (ownerID && ownerID !== uid) {
        return NextResponse.json(
          { message: "user does not own record" },
          { status: 200 }
        );
      }

      const authorizedUsers = snapshot.get("authorizedUsers");
      if (authorizedUsers && !authorizedUsers.includes(uid)) {
        return NextResponse.json(
          { message: "user not authorized" },
          { status: 200 }
        );
      }

      if (!authorizedUsers && !ownerID) {
        return NextResponse.json(
          { message: "Object has to be a list or a section." },
          { status: 200 }
        );
      }
    } catch (error) {
      console.log("recursive delete failed to authorize: ", error);
      return NextResponse.json({ message: error }, { status: 500 });
    }
    console.log(
      `User ${uid} has successfully requested to delete path ${path}`
    );

    // TODO add collection delete script :
    // https://firebase.google.com/docs/firestore/manage-data/delete-data#collections

    interface DeleteQueryBatchProps {
      db: Firestore;
      query: firestore.Query;
      resolve: (value: unknown) => void;
    }

    const deleteQueryBatch = async ({
      db,
      query,
      resolve,
    }: DeleteQueryBatchProps) => {
      const snap = await query.get();

      const batchSize = snap.size;
      if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve("success");
        return;
      }

      // Delete documents in a batch
      const batch = db.batch();
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch({ db, query, resolve });
      });
    };

    interface DeleteCollectionProps {
      db: Firestore;
      collectionPath: string;
      batchSize: number;
    }

    const deleteCollection = async ({
      db,
      collectionPath,
      batchSize,
    }: DeleteCollectionProps) => {
      const collectionRef = db.collection(collectionPath);
      const query = collectionRef.orderBy("__name__").limit(batchSize);

      return new Promise((resolve, reject) => {
        deleteQueryBatch({ db, query, resolve }).catch(reject);
      });
    };

    const itemsPath = `${path}/items`;
    await deleteCollection({
      db: adminDb(),
      collectionPath: itemsPath,
      batchSize: 300,
    });

    const sectionsPath = `${path}/sections`;
    const sections = await adminDb().collection(sectionsPath).listDocuments();
    sections.forEach(async (section) => {
      const sectionPath = section.path;
      const sectionItemsPath = `${sectionPath}/items`;
      await deleteCollection({
        db: adminDb(),
        collectionPath: sectionItemsPath,
        batchSize: 300,
      });
      await adminDb().doc(sectionPath).delete();
    });

    await adminDb().doc(path).delete();

    return NextResponse.json({ message: "success" }, { status: 200 });
  } catch (error) {
    console.log("recursivedelete error: ", error);
    return NextResponse.json({ message: error }, { status: 500 });
  }
};
