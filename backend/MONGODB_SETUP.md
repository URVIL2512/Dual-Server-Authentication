# MongoDB Atlas Setup

## Update your .env file

Replace the MONGO_URI in `backend/.env` with your MongoDB Atlas connection string:

```
PORT=5000
MONGO_URI=mongodb+srv://<db_username>:<db_password>@cluster0.w8ce3ev.mongodb.net/dual-server-iot?retryWrites=true&w=majority
HONEY_MAX=10
```

**Important:** 
- Replace `<db_username>` with your MongoDB Atlas username
- Replace `<db_password>` with your MongoDB Atlas password
- Add database name: `/dual-server-iot` before the query parameters
- The connection string should NOT have angle brackets `< >` in the final version

## Steps:

1. Open `backend/.env` file
2. Update the MONGO_URI line with the connection string above
3. Save the file
4. Restart the backend server

## If connection fails:

1. Check your MongoDB Atlas IP whitelist - add `0.0.0.0/0` to allow all IPs (for testing)
2. Verify username and password are correct
3. Check network connectivity

