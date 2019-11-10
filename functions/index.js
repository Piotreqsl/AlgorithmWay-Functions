const functions = require("firebase-functions");

/// Todo: save post (similar to like but stored in redux!!), image upload to post(with busboy returning imageUrl!!)
//Todo userclaims

const {
  getAllPosts,
  postOnePost,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
  uploadPostImage,
  deletePostImage

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

app.get('/post/:postId/like', FBEmailAuth, likePost);
app.get('/post/:postId/unlike', FBEmailAuth, unlikePost);

app.get('/confirm_email/:id', cofirmEmail);


app.post('/post/uploadImage', FBEmailAuth, uploadPostImage);
app.post('/post/deleteImage/:filename', FBEmailAuth, deletePostImage);


app.post('/post/:postId/comment', FBAuth, commentOnPost);
//User Details
app.post("/user", FBAuth, addUserDetails);
app.post("/post", FBEmailAuth, postOnePost); // Fbauth dodac !!!!!
app.post("/signup", signup);
app.post("/login", login);
/// Upload avatar
app.post('/user/image', FBAuth, uploadImage);
exports.api = functions.region("europe-west1").https.onRequest(app);