const functions = require("firebase-functions");
const admin = require("firebase-admin");

const config = {
  apiKey: "AIzaSyCuRS_yHHULrnlaOgc_tE5Bv2kjXiBkYz0",
  authDomain: "algorithmway-420.firebaseapp.com",
  databaseURL: "https://algorithmway-420.firebaseio.com",
  projectId: "algorithmway-420",
  storageBucket: "algorithmway-420.appspot.com",
  messagingSenderId: "1009067896551",
  appId: "1:1009067896551:web:bceb6a3784122947dafc42",
  measurementId: "G-M58EBD4XX4"
};

const firebase = require("firebase");
firebase.initializeApp(config);
admin.initializeApp(config);
const db = admin.firestore();

const express = require("express");
const app = express();

app.get("/posts", (req, res) => {
  db.collection("Posts")
    .orderBy("createdAt", "desc")
    .get()
    .then(data => {
      let posts = [];
      data.forEach(doc => {
        posts.push({
          postId: doc.id,
          title: doc.data().title,
          desc: doc.data().desc,
          shortDesc: doc.data().shortDesc,
          java: doc.data().java,
          cpp: doc.data().cpp,
          python: doc.data().python,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt
        });
      });
      return res.json(posts);
    })
    .catch(err => console.error(err));
});

const FBAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.error("No token found");
    return res.status(403).json({ error: "Unauthorized" });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then(decodedToken => {
      req.user = decodedToken;
      console.log(decodedToken);
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then(data => {
      req.user.handle = data.docs[0].data().handle;
      return next();
    })
    .catch(err => {
      console.error("Error while veryfying token", err);
      return res.status(403).json(err);
    });
};

app.post("/createPost", (req, res) => {
  /////// Dodać na drugim paramie FBAUTH !!!!!
  ///Todo if nont Empy !!!!!!!!!!!!!!!!!!!!!!! z returnami

  const newAlgorithm = {
    desc: req.body.desc,
    shortDesc: req.body.shortDesc,
    title: req.body.title,
    userHandle: req.body.userHandle, /// tutaj na fbauth req.user.handle
    java: req.body.java,
    cpp: req.body.cpp,
    python: req.body.python,
    createdAt: new Date().toISOString()
  };

  db.collection("Posts")
    .add(newAlgorithm)
    .then(doc => {
      res.json({
        message: `document ${doc.id} created successfully.`
      });
    })
    .catch(err => {
      res.status(500).json({
        error: "something went wrong"
      });
      console.error(err);
    });
});

// signup
app.post("/signup", (req, res) => {
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
      return data.user.getIdToken();
    })
    .then(idToken => {
      token = idToken;
      const userCredentials = {
        /// Ustawianie objecta do user collections
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId
      }; /// ustawienie nicknamu w bazie danych
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(data => {
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
});

app.post("/login", (req, res) => {
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
          .json({ general: "Wrong credentials, please try again" });
      } else {
        return res.status(500).json({
          error: err.code
        });
      }
    });
});

exports.api = functions.region("europe-west1").https.onRequest(app);
