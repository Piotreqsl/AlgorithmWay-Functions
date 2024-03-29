const {
  db,
  admin
} = require("../util/admin");

const config = require("../util/config");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
require('dotenv');
const firebase = require("firebase");
firebase.initializeApp(config);

const passwordQ = 'skC1939zhpoog';
const hemail = 'onionauth@gmail.com';


const smtpConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // use SSL
  auth: {
    user: hemail,
    pass: passwordQ
  }
};

const confirmMAILredirectLINK = "https://codelimes.live/login#success";

///Encrypt user verification
function md5(string) {
  return crypto
    .createHash("md5")
    .update(string)
    .digest("hex");
}

function sendVerificationLink(email, link) {
  


  var transporter = nodemailer.createTransport(smtpConfig);
  var mailOptions = {
    from: hemail, // sender address
    to: email, // list of receivers
    subject: "Email verification - CodeLimes", // Subject line
    text: "Email verification, press here to verify your email: " + link,
    html: "<center> <img style='height: 35px' src='https://firebasestorage.googleapis.com/v0/b/algorithmway-420.appspot.com/o/codelimes_logo_black.png?alt=media&token=9fffc339-541b-4d8f-998d-f92d25655119' /> <br><br>  <div style='font-size: 15px' >  Click <a style='text-decoration: none; color: #6F6F8C; font-weight: 700; ' href=" + link + "> here </a> to verify your CodeLimes account! </div> <br><br><br><br> <div style='font-size: 9px;'> If you didn't create account on our website, please ignore this message. </div>  </center> "
  };
  transporter.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log(error);
    } else {
      console.log("Message sent: " + mailOptions.text);
    }
  });
}

function sendPasswordResetLink(email, link) {
 
  var transporter = nodemailer.createTransport(smtpConfig);
  var mailOptions = {
    from: hemail, // sender address
    to: email, // list of receivers
    subject: "Password reset - CodeLimes", // Subject line
    text: "Password reset, press here to reset your password: " + link,
    html:

      "<center> <img style='height: 35px' src='https://firebasestorage.googleapis.com/v0/b/algorithmway-420.appspot.com/o/codelimes_logo_black.png?alt=media&token=9fffc339-541b-4d8f-998d-f92d25655119' /> <br><br>  <div style='font-size: 15px' >  Click <a style='text-decoration: none; color: #6F6F8C; font-weight: 700; ' href=" + link + "> here </a> to reset your password for CodeLimes account! </div> <br><br><br><br> <div style='font-size: 9px;'> If you didn't request a password change on our website, it can mean that someone was trying to break into your account. </div>  </center> "
    // html body
  };
  transporter.sendMail(mailOptions, function (error, response) {
    if (error) {
      console.log(error);
    } else {
      console.log("Message sent: " + mailOptions.text);
    }
  });
}

exports.signup = async (req, res) => {
  ///Setowanie usera
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle
  };

  const isEmail = email => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;
  };

  const isEmpty = string => {
    if (
      string === null ||
      typeof string === "undefined" ||
      string.trim() === ""
    ) {
      return true;
    } else {
      return false;
    }
  };

  let errors = {};

  if (isEmpty(newUser.email)) {
    errors.email = "Email must not be empty";
  }
  if (!isEmail(newUser.email)) {
    errors.email = "Must be a valid email adress";
  }

  if (newUser.password.length < 8)
    errors.password = "This password is too short";
  if (newUser.password.length > 25)
    errors.password = "This password is too long";
  if (newUser.handle.length > 25) errors.handle = "This nickname is too long";
  if (newUser.handle.length <= 0) errors.handle = "This nickname is too short";

  if (isEmpty(newUser.password)) errors.password = "Password must not be empty";
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "Passwords must match";
  if (isEmpty(newUser.handle)) errors.handle = "Must not be empty";

  var docRef = db.collection("users").doc(newUser.handle);
  await docRef.get().then(doc => {
    if (doc.exists) {
      errors.handle = "This username is already taken";
    } else {
      console.log("free");
    }
  });

  var emailRef = db.collection("users").where("email", "==", newUser.email);
  await emailRef.get().then(querySnapshot => {
    if (querySnapshot.size > 0) {
      errors.emailUsed = "Email is already in use!";
    } else {
      console.log("Email is free");
    }
  });

  console.log(errors);

  /// Główny if ufff

  if (Object.keys(errors).length > 0) return res.status(400).json(errors);
  else {
    const noImg = "no-img.png";

    let token, userId;

    /// Sprawdzanie czy user jest w database
    db.doc(`/users/${newUser.handle}`)
      .get()
      .then(doc => {
        if (doc.exists) {
          // o tu sie sprawdza
          errors.handle = "this handle is already taken";
        } else {
          /// Dodanie użytkownika

          return firebase
            .auth()
            .createUserWithEmailAndPassword(newUser.email, newUser.password);
        }
      }) // Zwracanie tokena
      .then(data => {
        userId = data.user.uid; // user id do user collections

        const userIDHash = md5(data.user.uid); /////// Setowanie maiala confirm
        db.collection("Email-Verifications")
          .doc(userIDHash)
          .set({
            userId: data.user.uid
          })
          .then(() => {
            console.log("Succes");
          });
        const verificationLink = `https://europe-west1-algorithmway-420.cloudfunctions.net/api/confirm_email/${userIDHash}`;
        sendVerificationLink(newUser.email, verificationLink);

        return data.user.getIdToken();
      })
      .then(idToken => {
        token = idToken;
        const userCredentials = {
          /// Ustawianie objecta do user collections
          handle: newUser.handle,
          reputation: 0,
          email: newUser.email,
          createdAt: new Date().toISOString(),
          imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
          userId
        }; /// ustawienie nicknamu w bazie danych
        return db.doc(`/users/${newUser.handle}`).set(userCredentials);
      })
      .then(() => {
        return admin.auth().setCustomUserClaims(userId, {
          user: true,
          admin: false
        });
      })
      .then(() => {
        /// zwracanie pozytywnego responsa
        return res.status(201).json({
          token
        });
      })
      .catch(err => {
        console.error(err);
        if (err.code === "auth/email-already-in-use") {
          errors.emailUse = "Email is already in use";
          return res.json(errors);
        } else {
          /// inny błąd
          return res.status(500).json({
            general: "Something went wrong, please try again"
          });
        }
      });
  }
};

exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  let errors = {};

  const isEmpty = string => {
    if (
      string === null ||
      typeof string === "undefined" ||
      string.trim() === ""
    ) {
      return true;
    } else {
      return false;
    }
  };

  const isEmail = email => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regEx)) return true;
    else return false;
  };

  if (isEmpty(user.email)) errors.email = "Must not be empty";
  if (isEmpty(user.password)) errors.password = "Must not be empty";
  if (!isEmail(user.email)) errors.email = "Must be a valid e-mail";

  if (Object.keys(errors).length > 0) {
    return res.status(400).json(errors);
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      if (data.user.emailVerified) {
        return data.user.getIdToken().then(token => {

          return admin.auth().verifyIdToken(token).then(claims => {
            if (claims.user) {
              return res.json({
                token
              });
            } else {
              return res.status(403).json({
                general: "Your account is banned."
              });
            }

          })


        });
      } else {
        return res.status(403).json({
          general: "You have to verify your email!"
        });
      }
    })

    .catch(err => {
      console.error(err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        return res.status(403).json({
          general: "Wrong credentials, please try again"
        });
      } else {
        return res.status(500).json({
          error: err.code
        });
      }
    });
};

exports.cofirmEmail = (req, res) => {
  const id = req.params.id;
  const hashRef = db.collection("Email-Verifications").doc(id);
  hashRef
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(403).json({
          error: "no such doc"
        });
      } else {
        admin
          .auth()
          .updateUser(doc.data()["userId"], {
            emailVerified: true
          })
          .then(function (userRecord) {
            console.log("Successfully updated user", userRecord.toJSON());
            db.collection("Email-Verifications")
              .doc(id)
              .delete();
            return res.redirect(confirmMAILredirectLINK)
          })
          .catch(err => {
            console.log("error ", err);
            return res.status(500);
          });
      }
    })
    .catch(err => {
      console.log("Error getting document", err);
      return response.status(500);
    });
};

exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({
    headers: req.headers
  });

  let imageFilename;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (
      mimetype !== "image/jpeg" &&
      mimetype !== "image/png" &&
      mimetype !== "image/jpg"
    ) {
      return res.status(400).json({
        error: "Wrong file submitted"
      });
    }

    const imageExstension = filename.split(".")[filename.split(".").length - 1];
    imageFilename = `${Math.round(
      Math.random() * 10000000
    )}.${imageExstension}`;
    const filepath = path.join(os.tmpdir(), imageFilename);

    imageToBeUploaded = {
      filepath,
      mimetype
    };

    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on("finish", () => {
    admin
      .storage()
      .bucket(config.storageBucket)
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
      .then(() => {
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFilename}?alt=media`;
        return db.doc(`/users/${req.user.handle}`).update({
          imageUrl
        });
      })
      .then(() => {
        return res.json({
          message: "image uploaded succesfully"
        });
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({
          error: err.code
        });
      });
  });
  busboy.end(req.rawBody);
};

exports.addUserDetails = (req, res) => {
  const isEmpty = string => {
    if (
      string === null ||
      typeof string === "undefined" ||
      string.trim() === ""
    ) {
      return true;
    } else {
      return false;
    }
  };

  let userDetails = {};
  if (!isEmpty(req.body.bio)) userDetails.bio = req.body.bio;
  if (!isEmpty(req.body.location)) userDetails.location = req.body.location;

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return db
        .doc(`/users/${req.user.handle}`)
        .get()
        .then(doc => {
          return res.json(doc.data());
        })
        .then(() => {
          return res.json({
            success: "User info changed successfully"
          });
        });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({
        error: err.code
      });
    });
};

exports.resetPassword = (req, res) => {
  return db
    .collection("users")
    .where("email", "==", req.body.body)
    .get()
    .then(querySnapshot => {
      if (querySnapshot.size === 0) {
        console.log(req.body.body);
        return res.status(404).json({
          error: "Email not found"
        });
      } else {
        admin
          .auth()
          .generatePasswordResetLink(req.body.body)
          .then(link => {
            sendPasswordResetLink(req.body.body, link);
            return res.status(200).json({
              success: "Password reset link has been sent to your email"
            });
          });
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(400).json({
        error: err.code
      });
    });
};
// Wszystkie user data na zalogowanego
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};

  db.doc(`/users/${req.user.handle}`)
    .get()
    .then(doc => {
      if (doc.exists) {
        userData.credentials = doc.data();
        userData.credentials.isEmailVerified = req.user.email_verified;
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then(data => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });

      return db
        .collection("edit-requests")
        .where("originalPosterHandle", "==", req.user.handle)
        .where("approved", "==", false)
        .get();
    })
    .then(data => {
      userData.editRequests = [];
      data.forEach(doc => {
        let editRequestData = {};
        editRequestData = doc.data();
        editRequestData.id = doc.id;
        userData.editRequests.push(editRequestData);
      });

      return db
        .collection("favourites")
        .where("userHandle", "==", req.user.handle)
        .get();
    })

    .then(data => {
      userData.favourites = [];
      data.forEach(doc => {
        userData.favourites.push(doc.data());
      });
      return admin.auth().getUserByEmail(userData.credentials.email);
    })
    .then(userRecord => {
      userData.userPrivileges = userRecord.customClaims.user;
      userData.adminPrivileges = userRecord.customClaims.admin;
      return db
        .collection("notifications")
        .where("recipient", "==", req.user.handle)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          postId: doc.data().postId,
          type: doc.data().type,
          read: doc.data().read,
          title: doc.data().title,
          notificationId: doc.id
        });
      });
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({
        error: err.code
      });
    });
};

exports.getUserByName = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.username}`)
    .get()
    .then(doc => {
      if (!doc.exists) {
        return res.status(404).json({
          error: "User not found"
        });
      } else {
        userData = doc.data();
        return res.json(userData);
      }
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({
        error: err.code
      });
    });
};

exports.getEditRequests = (req, res) => {
  if (req.user.admin) {
    return db
      .collection("edit-requests")
      .where("approved", "==", false)
      .orderBy("createdAt", "desc")
      .get()
      .then(data => {
        if (data.size === 0) {
          return res.status(200).json({
            error: "There are no pending requests"
          });
        } else {
          let edits = [];
          data.forEach(doc => {
            let object = {};
            object = doc.data();
            object.id = doc.id;
            edits.push(object);
          });
          return res.status(200).json(edits);
        }
      });
  } else {
    return db
      .collection("edit-requests")
      .where("originalPosterHandle", "==", req.user.handle)
      .where("approved", "==", false)
      .orderBy("createdAt", "desc")
      .get()
      .then(data => {
        if (data.size === 0) {
          return res.status(200).json({
            error: "There are no pending edit requests for you"
          });
        } else {
          let edits = [];
          data.forEach(doc => {
            let object = {};
            object = doc.data();
            object.id = doc.id;
            edits.push(object);
          });
          return res.status(200).json(edits);
        }
      });
  }
};

exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();

  req.body.forEach(notificationId => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, {
      read: true
    });
  });

  batch
    .commit()
    .then(() => {
      return res.json({
        message: "Notifications marked read"
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({
        error: err.code
      });
    });
};