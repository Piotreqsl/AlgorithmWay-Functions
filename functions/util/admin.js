const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json")

const config = require('./config');

admin.initializeApp(config);

const db = admin.firestore();

module.exports = {
    admin,
    db
};