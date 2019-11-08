const {
    db,
    admin
} = require('../util/admin');



const config = require('../util/config');
const nodemailer = require('nodemailer');




const firebase = require('firebase');
firebase.initializeApp(config);


function sendVerificationLink(email, link) {
    var smtpConfig = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // use SSL
        auth: {
            user: 'algorithmwayonion@gmail.com',
            pass: 'onion12#'
        }
    };
    var transporter = nodemailer.createTransport(smtpConfig);
    var mailOptions = {
        from: "algorithmwayonion@gmail.com", // sender address 
        to: email, // list of receivers
        subject: "Email verification AlgorithmWay", // Subject line
        text: "Email verification, press here to verify your email: " + link,
        html: "<b>Hello there,<br> click <a href=" + link + "> here</a> to verify your AlghorithmWay account</b><br><br>If you didn't create account on our website, please ignore this message." // html body
    };
    transporter.sendMail(mailOptions, function (error, response) {
        if (error) {
            console.log(error);
        } else {
            console.log("Message sent: " + mailOptions.text);
        }
    });
}



exports.signup = (req, res) => {
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
        if (string.trim() === "") {
            return true;
        } else {
            return false;
        }
    };

    let errors = {};

    if (isEmpty(newUser.email)) {
        errors.email = "Email must not be empty.";
    } else if (!isEmail(newUser.email)) {
        errors.email = "Must be a valid email adress.";
    }

    if (isEmpty(newUser.password)) errors.password = "Password must not be empty";
    if (newUser.password !== newUser.confirmPassword)
        errors.confirmPassword = "Passwords must match";
    if (isEmpty(newUser.handle)) errors.handle = "Must not be empty";

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);


    const noImg = 'no-img.png';


    let token, userId;
    /// Sprawdzanie czy user jest w database
    db.doc(`/users/${newUser.handle}`)
        .get()
        .then(doc => {
            if (doc.exists) {
                // o tu sie sprawdza
                return res.status(400).json({
                    handle: "this handle is already taken"
                });
            } else {
                /// Dodanie użytkownika

                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        }) // Zwracanie tokena
        .then(data => {

            userId = data.user.uid; // user id do user collections

            const userIDHash = data.user.uid; /////// Setowanie maiala confirm
            db.collection('Email-Verifications').doc(userIDHash).set({
                userId: data.user.uid
            }).then(() => {
                console.log("Succes")
            });
            const verificationLink = `https://europe-west1-algorithmway-420.cloudfunctions.net/api/confirm_email/${userIDHash}`;
            sendVerificationLink(newUser.email, verificationLink);

            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            const userCredentials = {
                /// Ustawianie objecta do user collections
                type: "user",
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
                userId
            }; /// ustawienie nicknamu w bazie danych
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
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
                return res.status(400).json({
                    email: "Email is already in use"
                });
            } else {
                /// inny błąd
                return res.status(500).json({
                    error: err.code
                });
            }
        });
}

exports.login = (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    };

    let errors = {};

    const isEmpty = string => {
        if (string.trim() === "") {
            return true;
        } else {
            return false;
        }
    };

    if (isEmpty(user.email)) errors.email = "Must not be empty";
    if (isEmpty(user.password)) errors.password = "Must not be empty";

    if (Object.keys(errors).length > 0) {
        return res.status(400).json(errors);
    }

    firebase
        .auth()
        .signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({
                token
            });
        })
        .catch(err => {
            console.error(err);
            if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
                return res
                    .status(403)
                    .json({
                        general: "Wrong credentials, please try again"
                    });
            } else {
                return res.status(500).json({
                    error: err.code
                });
            }
        });
}

exports.cofirmEmail = (req, res) => {
    const id = req.params.id;
    const hashRef = db.collection('Email-Verifications').doc(id);
    hashRef.get().then(doc => {
            if (!doc.exists) {
                return res.status(403).json({
                    error: "no such doc"
                });
            } else {

                admin.auth().updateUser(doc.data()['userId'], {
                        emailVerified: true
                    })
                    .then(function (userRecord) {
                        console.log("Successfully updated user", userRecord.toJSON());
                        db.collection('Email-Verifications').doc(id).delete();
                        return res.status(200).json({
                            succes: "Sucessfully verified"
                        });
                    })
                    .catch(err => {
                        console.log("error ", err);
                        return res.status(500);
                    });
            }
        })
        .catch(err => {
            console.log('Error getting document', err);
            return response.status(500);
        });

};

exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');


    const busboy = new BusBoy({
        headers: req.headers
    });


    let imageFilename;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {


        if (mimetype !== 'image/jpeg' && mimetype !== 'image/png' && mimetype !== 'image/jpg') {
            return res.status(400).json({
                error: "Wrong file submitted"
            });
        }

        const imageExstension = filename.split('.')[filename.split(".").length - 1];
        imageFilename = `${Math.round(Math.random()*10000000)}.${imageExstension}`;
        const filepath = path.join(os.tmpdir(), imageFilename);

        imageToBeUploaded = {
            filepath,
            mimetype
        };

        file.pipe(fs.createWriteStream(filepath));


    });

    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {

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
                })
            })
            .catch(err => {
                console.error(err);
                return res.status(500).json({
                    error: err.code
                });
            });

    });
    busboy.end(req.rawBody);
}

exports.addUserDetails = (req, res) => {
    let userDetails = {};
    if (!isEmpty(req.body.bio.trim())) userDetails.bio = req.body.bio;


    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            return res.json({
                message: "Details added succesfully"
            });
        }).catch(err => {
            console.error(err);
            return res.status(500).json({
                error: err.code
            });
        })



}

// Wszystkie user data na zalogowanego
exports.getAuthenticatedUser = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                userData.credentials = doc.data();
                return db.collection("likes").where("userHandle", '==', req.user.handle).get();
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });
            return res.json(userData);
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({
                error: err.code
            });
        })
}

exports.getUserByName = (req, res) => {
    let userData = {};
    db.doc(`/users/${req.params.username}`).get()
        .then(doc => {
            if (!doc.exists) {
                return res.status(400).json({
                    error: "No user found"
                });
            }
            userData = doc.data();
            userData.handle = doc.id;
            return res.json(userData);
        })

}