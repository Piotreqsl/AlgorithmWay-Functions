const functions = require("firebase-functions");

const {
  db,
  admin
} = require("./util/admin");


//Todo: Trigger on change editrequest: post contributors and approval by admin notification!

//Done: reputation, save posts, admin fucntions, On image change do post requests, Edit requests with approval!

const {
  verifyPost,
  addAdminPrivileges
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
  approveEditRequest
} = require("./handlers/posts");

const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserByName,
  cofirmEmail,
  markNotificationsRead
} = require("./handlers/users");

const FBAuth = require("./util/FBAuth");
const adminAuth = require("./util/adminAuth");
const FBEmailAuth = require("./util/FBEmailAuth");

const app = require("express")();

app.post("/admin/:postId/verify", adminAuth, verifyPost);
app.post("/admin/add", adminAuth, addAdminPrivileges);


/// Post routes
app.get("/posts", getAllPosts);
app.get("/posts/:postId", getPost);
app.post("/post", FBEmailAuth, postOnePost);
app.get("/post/:postId/like", FBEmailAuth, likePost);
app.get("/post/:postId/unlike", FBEmailAuth, unlikePost);
app.get("/post/:postId/addFav", FBAuth, addFav);
app.get("/post/:postId/removeFav", FBAuth, removeFav);
app.post("/post/:postId/createEditRequest", FBEmailAuth, createEditRequest);
app.post("/post/:editPostId/approveEditRequest", FBEmailAuth, approveEditRequest);



app.post("/post/uploadImage", FBEmailAuth, uploadPostImage);
app.post("/post/deleteImage/:filename", FBEmailAuth, deletePostImage);
app.post("/posts/delete/:postId", FBEmailAuth, deletePost);
app.post("/post/:postId/comment", FBAuth, commentOnPost);


app.get("/user", FBAuth, getAuthenticatedUser);
app.post("/user", FBAuth, addUserDetails);
app.get("/users/:username", getUserByName);
app.get("/confirm_email/:id", cofirmEmail);
app.post("/signup", signup);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/notifications", FBAuth, markNotificationsRead);


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
          return db
            .doc(`/notifications/${snapshot.id}`)
            .set({
              createdAt: new Date().toISOString(),
              recipient: doc.data().userHandle,
              sender: snapshot.data().userHandle,
              type: "like",
              read: false,
              postId: doc.id,
              title: doc.data().title
            })
            .then(() => {
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

                return db.doc(`/users/${doc.data().userHandle}`).update({
                  reputation: posterData.reputation
                });
              });
          });
      })

      .catch(err => {
        console.error(err);
      });
  });


exports.onEditRequestCreate = functions
  .region('europe-west1')
  .firestore
  .document('edit-requests/{id}')
  .onCreate(snapshot => {
    return db
      .doc(`/Posts/${snapshot.data().originalPostId}`)
      .get()
      .then(doc => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db
            .doc(`/notifications/${snapshot.id}`)
            .set({
              createdAt: new Date().toISOString(),
              recipient: doc.data().userHandle,
              sender: snapshot.data().userHandle,
              type: "edit-request",
              read: false,
              editPostId: snapshot.id,
              postId: doc.id,
              title: doc.data().title
            })
        }
      })
      .catch(err => {
        console.error(err);
      })
  })





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
      }).then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/edit-requests/${doc.id}`));
        })
        return batch.commit();
      })
      .catch(err => {
        console.error("error");
      });
  });