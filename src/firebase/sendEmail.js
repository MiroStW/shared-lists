/* eslint-disable @typescript-eslint/no-var-requires */
const { firestore, https } = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const nodemailer = require("nodemailer");

if (!admin.apps.length) {
  admin.initializeApp();
}

let transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY,
  },
});

const headers = {
  "Access-Control-Allow-Origin": "*" /* @dev First, read about security */,
  "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
  "Access-Control-Max-Age": 2592000, // 30 days
  /** add other headers as per requirement */
};

exports.sendEmail = firestore
  .document("/invites/{documentId}")
  .onCreate(async (snap) => {
    const { inviterID, inviteeEmail, listID } = snap.data();
    const inviteID = snap.ref.id;

    const invitingUser = await admin.auth().getUser(inviterID);
    const listSnapshot = await admin.firestore().doc(`/lists/${listID}`).get();

    const update = await snap.ref.update({ email_status: "success" });
    console.log("update: ", update);

    const mailOptions = {
      from: "Shared lists <shared-lists@miro-wilms.de>",
      to: "flair2k@gmail.com",
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
      function(error, info) {
        if (error) {
          snap.ref.update({ email_status: "error" });
          console.log(error);
        } else {
          console.log("Email sent: " + info.response);
        }
      },
    };

    return transporter.sendMail(mailOptions);
  });
