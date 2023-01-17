/* eslint-disable @typescript-eslint/no-var-requires */
const { region } = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

if (!admin.apps.length) {
  admin.initializeApp();
}

const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY,
  },
});

exports.sendEmail = region("europe-west1")
  .firestore.document("/invites/{documentId}")
  .onCreate(async (snap) => {
    const { inviterID, inviteeEmail, listID } = snap.data();
    const inviteID = snap.ref.id;

    const invitingUser = await admin.auth().getUser(inviterID);
    const listSnapshot = await admin.firestore().doc(`/lists/${listID}`).get();

    const mailOptions = {
      from: "Shared lists <shared-lists@miro-wilms.de>",
      to: inviteeEmail,
      subject: `${invitingUser.displayName} invited you to join ${
        listSnapshot.data().name
      } list`,
      html: `<p style="font-size: 16px;">
          Hi there, <br /><br />
          ${invitingUser.displayName} invited you to join the "${
        listSnapshot.data().name
      }" list. <br /><br />
          Click <a href="https://shared-lists-8fc29.web.app/invites/${inviteID}">here</a> to join the list
          </p>
          <br />

          `,
      async function(error, info) {
        if (error) {
          const update = snap.ref.update({ email_status: "error" });
          console.log("update: ", update);
          console.log(error);
        } else {
          const update = await snap.ref.update({ email_status: "success" });
          console.log("update: ", update);
          console.log("Email sent: ", info.response);
        }
      },
    };

    return transporter.sendMail(mailOptions);
  });
