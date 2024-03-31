let username,
  email = "sourav@gmail.com";

if ([username, email].some((field) => field?.trim() === "")) {
  console.log("All fields are required");
}
else{
    console.log("All fields available");
}
