const functions = require("firebase-functions");

// funckja like i dislike ma wyłączoną reputację jeszcze //

const {
  db,
  admin
} = require("./util/admin");

// Ew sprawdzic czy contributors działają

const {
  verifyPost,
  addAdminPrivileges,
  banUser
} = require("./handlers/adminFunctions");

const {
  getAllPosts,
  postOnePost,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
  uploadPostImage,
  deletePostImage,
  deletePost,
  addFav,
  removeFav,
  createEditRequest,
  approveEditRequest,
  getEditRequest,
  getNextPosts,
  getAllPostsToAdmin,
  deleteComment,
  rejectEditRequest
} = require("./handlers/posts");

const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserByName,
  cofirmEmail,
  markNotificationsRead,
  resetPassword,
  getEditRequests
} = require("./handlers/users");

const FBAuth = require("./util/FBAuth");
const adminAuth = require("./util/adminAuth");
const FBEmailAuth = require("./util/FBEmailAuth");

const app = require("express")();

const cors = require("cors");
app.use(cors());

app.post("/admin/:postId/verify", adminAuth, verifyPost);
app.post("/admin/add", adminAuth, addAdminPrivileges);
app.post("/admin/ban", adminAuth, banUser);

/// Post routes
app.get("/posts", getAllPosts);
app.get("/posts/next/:postId", getNextPosts);
app.get("/posts/:postId", getPost);
app.get("/allPosts", getAllPostsToAdmin);

app.post("/comment/:commentId/delete", FBEmailAuth, deleteComment);
app.post("/post", FBEmailAuth, postOnePost);
app.get("/post/:postId/like", FBEmailAuth, likePost);
app.get("/post/:postId/unlike", FBEmailAuth, unlikePost);
app.get("/post/:postId/addFav", FBAuth, addFav);
app.get("/post/:postId/removeFav", FBAuth, removeFav);
app.post("/post/:postId/createEditRequest", FBEmailAuth, createEditRequest);
app.post(
  "/post/:editPostId/approveEditRequest",
  FBEmailAuth,
  approveEditRequest
);
app.post("/post/:editPostId/rejectEditRequest", FBEmailAuth, rejectEditRequest);

app.get("/post/:editPostId/editRequest", FBEmailAuth, getEditRequest);

app.post("/post/uploadImage", FBEmailAuth, uploadPostImage);
app.post("/post/deleteImage/:filename", FBEmailAuth, deletePostImage);
app.delete("/post/:postId", FBEmailAuth, deletePost);
app.post("/post/:postId/comment", FBAuth, commentOnPost);

app.get("/getEditRequests", FBEmailAuth, getEditRequests);
app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/user", FBAuth, addUserDetails);
app.get("/users/:username", getUserByName);
app.get("/confirm_email/:id", cofirmEmail);
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/notifications", FBAuth, markNotificationsRead);
app.post("/passwordReset", resetPassword);

exports.api = functions.region("europe-west1").https.onRequest(app);

exports.OnLike = functions
  .region("europe-west1")
  .firestore.document("likes/{id}")
  .onCreate(snapshot => {
    return db
      .doc(`/Posts/${snapshot.data().postId}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          let posterData;

          return db
            .doc(`/users/${doc.data().userHandle}`)
            .get()
            .then(userDoc => {
              posterData = userDoc.data();
              posterData.reputation++;

              return db.doc(`/users/${doc.data().userHandle}`).update({
                reputation: posterData.reputation
              });
            });
        }
      })
      .catch(err => {
        console.error(err);
      });
  });

exports.onUnlike = functions
  .region("europe-west1")
  .firestore.document("likes/{id}")
  .onDelete(snapshot => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .then(() => {
        return db
          .doc(`/Posts/${snapshot.data().postId}`)
          .get()
          .then(doc => {
            let posterData;
            return db
              .doc(`/users/${doc.data().userHandle}`)
              .get()
              .then(userDoc => {
                posterData = userDoc.data();
                posterData.reputation--;

                if (doc.data().userHandle !== snapshot.data().userHandle) {
                  return db.doc(`/users/${doc.data().userHandle}`).update({
                    reputation: posterData.reputation
                  });
                }
              });
          });
      })

      .catch(err => {
        console.error(err);
      });
  });

exports.onEditRequestCreate = functions
  .region("europe-west1")
  .firestore.document("edit-requests/{id}")
  .onCreate(snapshot => {
    return db
      .doc(`/Posts/${snapshot.data().originalPostId}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "edit-request",
            read: false,
            editPostId: snapshot.id,
            postId: doc.id,
            title: doc.data().title
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
  });

exports.createNotificationOnComment = functions
  .region("europe-west1")
  .firestore.document("comments/{id}")
  .onCreate(snapshot => {
    return db
      .doc(`/Posts/${snapshot.data().postId}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            postId: doc.id,
            title: doc.data().title
          });
        }
      })

      .catch(err => {
        console.error(err);
      });
  });

exports.onUserImageChange = functions
  .region("europe-west1")
  .firestore.document("/users/{userId}")
  .onUpdate(change => {
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("Image has changed");
      let batch = db.batch();
      return db
        .collection("Posts")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then(data => {
          data.forEach(doc => {
            const post = db.doc(`/Posts/${doc.id}`);
            batch.update(post, {
              userImage: change.after.data().imageUrl
            });
          });
        })
        .then(() => {
          return db
            .collection("comments")
            .where("userHandle", "==", change.before.data().handle)
            .get()
            .then(data => {
              data.forEach(doc => {
                const comment = db.doc(`/comments/${doc.id}`);
                batch.update(comment, {
                  userImage: change.after.data().imageUrl
                });
              });

              return batch.commit();
            });
        });
    } else {
      return true;
    }
  });

exports.onEditRequestApprove = functions
  .region("europe-west1")
  .firestore.document("/edit-requests/{id}")
  .onUpdate(change => {
    if (
      change.before.data().approved !== change.after.data().approved &&
      change.after.data().approvedBy === "admin"
    ) {
      return db
        .collection("notifications")
        .add({
          createdAt: new Date().toISOString(),
          postId: change.after.data().originalPostId,
          recipient: change.after.data().originalPosterHandle,
          sender: "AlgorithmWay admin",
          read: false,
          type: "edit-request-admin-to-owner",
          title: change.after.data().title
        })
        .then(() => {
          return db.collection("notifications").add({
            createdAt: new Date().toISOString(),
            postId: change.after.data().originalPostId,
            recipient: change.after.data().userHandle,
            sender: "AlgorithmWay admin",
            read: false,
            type: "edit-request-admin-to-sender",
            title: change.after.data().title
          });
        })
        .catch(err => {
          console.error(err);
        });
    }

    if (
      change.before.data().approved !== change.after.data().approved &&
      change.after.data().approvedBy === "owner"
    ) {
      return db
        .collection("notifications")
        .add({
          createdAt: new Date().toISOString(),
          postId: change.after.data().originalPostId,
          recipient: change.after.data().userHandle,
          sender: change.after.data().originalPosterHandle,
          read: false,
          type: "edit-request-owner-to-sender",
          title: change.after.data().title
        })
        .then(() => {})
        .catch(err => {
          console.error(err);
        });
    }
  });

exports.onPostDelete = functions
  .region("europe-west1")
  .firestore.document("/Posts/{postId}")
  .onDelete((snapshot, context) => {
    const postId = context.params.postId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("postId", "==", postId)
      .get()
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
          .collection("likes")
          .where("postId", "==", postId)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("postId", "==", postId)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return db
          .collection("favourites")
          .where("postId", "==", postId)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/favourites/${doc.id}`));
        });

        return db
          .collection("edit-requests")
          .where("originalPostId", "==", postId)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/edit-requests/${doc.id}`));
        });
        return batch.commit();
      })
      .catch(err => {
        console.error("error");
      });
  });