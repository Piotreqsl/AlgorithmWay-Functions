const {
    db,
    admin
} = require('../util/admin');



const config = require('../util/config');



const firebase = require('firebase');
firebase.initializeApp(config);


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
                console.log("user added")

                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        }) // Zwracanie tokena
        .then(data => {
            userId = data.user.uid; // user id do user collections
            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            const userCredentials = {
                /// Ustawianie objecta do user collections
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
            if (err.code === "auth/wrong-password") {
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
        console.log(fieldname);
        console.log(filename);
        console.log(mimetype);

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
};