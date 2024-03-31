import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then((response) => {
    app.listen(process.env.PORT || 8000, () =>
      console.log(`Server is running on port: ${process.env.PORT}`)
    );
  })
  .catch((error) => console.log(error));

// (async () => {
//   try {
//     await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);

//     app.on("error", (error) => console.log("Error in connection: ", error));

//     app.listen(process.env.PORT, () =>
//       console.log("App is listening on port: ", process.env.PORT)
//     );
//   } catch (error) {
//     console.log("Error in Connecting DB: " + error);
//   }
// })();
