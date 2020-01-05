const { db, admin } = require("../util/admin");
const config = require("../util/config");

exports.verifyPost = (req, res) => {
  let postData;

  db.doc(`/Posts/${req.params.postId}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "Post not found"
        });
      }

      postData = doc.data();

      if (postData.verified !== true) {
        postData.verified = true;

        return db
          .doc(`/Posts/${req.params.postId}`)
          .update({
            verified: postData.verified
          })
          .then(() => {
            return res.status(200).json({
              success: postData
            });
          });
      } else {
        return res.status(404).json({
          error: "Post already verified"
        });
      }
    })
    .catch(err => {
      console.error(err);
      return res.status(400).json({
        error: err.code
      });
    });
};

exports.addAdminPrivileges = (req, res) => {
  const email = req.body.body;

  admin
    .auth()
    .getUserByEmail(email)
    .then(user => {
      console.log(email);
      console.log(user.admin);
      console.log(user.emailVerified + " testt");

      if (user.customClaims.admin === false) {
        if (user.emailVerified === false) {
          console.log("niby ifik ");

          return res.status(400).json({
            general: "User must verify its mail!"
          });
        } else {
          console.log("nie ma ");
          return admin
            .auth()
            .setCustomUserClaims(user.uid, {
              user: true,
              admin: true
            })
            .then(() => {
              return res.json({
                general: "User has admin privileges now"
              });
            });
        }
      } else {
        console.log("jest");
        return res.status(400).json({
          general: "User is already an admin"
        });
      }
    })

    .catch(err => {
      console.error(err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-email"
      ) {
        return res.status(403).json({
          general: "Wrong email, please try again"
        });
      } else {
        return res.status(500).json({
          error: err.code
        });
      }
    });
};
