const functions = require("firebase-functions");


const {
  getAllPosts,
  postOnePost,
  getPost,
  commentOnPost
} = require('./handlers/posts');

const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserByName,
  cofirmEmail
} = require('./handlers/users');


const FBAuth = require('./util/FBAuth');
const moderatorAuth = require('./util/moderatorAuth');
const FBEmailAuth = require('./util/FBEmailAuth');

const app = require("express")();

/// Post routes
app.get("/posts", getAllPosts);
//// Get logged user info (do reduxa)
app.get('/user', FBAuth, getAuthenticatedUser);
// Get post by id (w comments);
app.get('/posts/:postId', getPost);
//Get user by username
app.get('/users/:username', getUserByName);

app.get('/confirm_email/:id', cofirmEmail);


app.post('/post/:postId/comment', FBAuth, commentOnPost);


//User Details
app.post("/user", FBAuth, addUserDetails);
app.post("/post", postOnePost); // Fbauth dodac !!!!!
app.post("/signup", signup);
app.post("/login", login);
/// Upload avatar
app.post('/user/image', FBAuth, uploadImage);
exports.api = functions.region("europe-west1").https.onRequest(app);