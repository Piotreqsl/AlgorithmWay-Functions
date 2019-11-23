const admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");


const config = require('./config');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://algorithmway-420.firebaseio.com",

});

const db = admin.firestore();

module.exports = {
    admin,
    db
};