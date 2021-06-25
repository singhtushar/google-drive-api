require("dotenv").config();
const express = require("express");
const { google } = require("googleapis");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ejs = require("ejs");

const app = express();

const PORT = process.env.PORT || 8000;

app.set("view engine", "ejs");

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./images");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

var upload = multer({
  storage: Storage,
}).single("file"); //Field name and max count

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/upload", (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.log(err);
      return res.end("Something went wrong");
    } else {
      console.log(req.file.path);
      const drive = google.drive({
        version: "v3",
        auth: oauth2Client,
      });
      const fileMetadata = {
        name: req.file.filename,
      };
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      };
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
        async (err, file) => {
          if (err) {
            // Handle error
            console.error(err);
          } else {
            //   console.log(file.data.id);
            const fileId = file.data.id;
            await drive.permissions.create({
                fileId: fileId,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                }
            });
            const result = await drive.files.get({
              fileId: fileId,
              fields: "webViewLink, webContentLink",
            });
            console.log(result.data);
            fs.unlinkSync(req.file.path);
            res.json({
                status: "Successfully Uploaded!!",
                view: result.data.webViewLink,
                download: result.data.webContentLink
            });
          }
        }
      );
    }
  });
});

app.listen(PORT, ()=>{
    console.log(`Server running at PORT ${PORT}`);
})
