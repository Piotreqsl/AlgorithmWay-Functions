const functions = require("firebase-functions");

const {
  db,
  admin
} = require('./util/admin');
/// Todo: save post (similar to like but stored in redux!!)
/// Edit requests!
/// Admin functions!


const {
  getAllPosts,
  postOnePost,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
  uploadPostImage,
  deletePostImage,
  deletePost

} = require('./handlers/posts');

const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserByName,
  cofirmEmail,
  markNotificationsRead
} = require('./handlers/users');


const FBAuth = require('./util/FBAuth');
const adminAuth = require('./util/adminAuth');
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

app.post('/posts/delete/:postId', FBEmailAuth, deletePost)


app.post('/post/:postId/comment', FBAuth, commentOnPost);
//User Details
app.post("/user", FBAuth, addUserDetails);
app.post("/post", FBEmailAuth, postOnePost); // Fbauth dodac !!!!!
app.post("/signup", signup);
app.post("/login", login);
/// Upload avatar
app.post('/user/image', FBAuth, uploadImage);
app.post('/notifications', FBAuth, markNotificationsRead);





exports.api = functions.region("europe-west1").https.onRequest(app);

exports.createNotificationOnLike = functions.region('europe-west1')
  .firestore.document('likes/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/Posts/${snapshot.data().postId}`).get()
      .then(doc => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            postId: doc.id,
            title: doc.data().title
          });
        }
      })
      .catch(err => {
        console.error(err)
      });
  });

exports.deleteNotificationOnUnlike = functions.region('europe-west1')
  .firestore.document('likes/{id}')
  .onDelete((snapshot) => {
    return db.doc(`/notifications/${snapshot.id}`)
      .delete()

      .catch(err => {
        console.error(err);
      })

  });




exports.createNotificationOnComment = functions.region('europe-west1')
  .firestore.document('comments/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/Posts/${snapshot.data().postId}`).get()
      .then(doc => {
        if (doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            postId: doc.id,
            title: doc.data().title
          });
        }
      })

      .catch((err) => {
        console.error(err)
      });

  });


exports.onUserImageChange = functions.region('europe-west1').firestore
  .document('/users/{userId}')
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("Image has changed");
      let batch = db.batch();
      return db.collection("Posts").where('userHandle', '==', change.before.data().handle).get()
        .then((data) => {
          data.forEach(doc => {
            const post = db.doc(`/Posts/${doc.id}`);
            batch.update(post, {
              userImage: change.after.data().imageUrl
            });
          })
          return batch.commit();
        })
    } else {
      return true
    }
  })


exports.onPostDelete = functions.region('europe-west1').firestore.document('/Posts/{postId}')
  .onDelete((snapshot, context) => {
    const postId = context.params.postId;
    const batch = db.batch();
    return db.collection('comments').where("postId", "==", postId).get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        })
        return db.collection('likes').where('postId', "==", postId).get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        })
        return db.collection('notifications').where('postId', "==", postId).get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        })
        return db.collection('favourites').where('postId', "==", postId).get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/favourites/${doc.id}`));
        })
        return batch.commit();
      })
      .catch(err => {
        console.error("error");
      })
  })