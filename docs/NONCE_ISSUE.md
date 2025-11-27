# Nonce Mismatch Issue - Troubleshooting

## Understanding Device Nonce (nᵢ)

The Device Nonce `ni` is a device-specific identifier that must match exactly between operations.

## Important Rules

1. **After Registration**: Use the **exact same nonce** you used during registration
2. **After Password Change**: Use the **nonce from the password change operation** (not the registration nonce)
3. **Nonce Updates**: When you change your password, the nonce you provide becomes the new stored nonce

## Common Scenarios

### Scenario 1: First Time Login
- **Registration**: ID=`qwerty123456`, Nonce=`qwerty123456`
- **Login**: ID=`qwerty123456`, Nonce=`qwerty123456` ✅

### Scenario 2: After Password Change
- **Registration**: ID=`qwerty123456`, Nonce=`oldnonce123`
- **Password Change**: ID=`qwerty123456`, Nonce=`newnonce456` ← This becomes the stored nonce
- **Login**: ID=`qwerty123456`, Nonce=`newnonce456` ✅ (must use the NEW nonce)

### Scenario 3: Wrong Nonce
- **Registration**: ID=`qwerty123456`, Nonce=`qwerty123456`
- **Login**: ID=`qwerty123456`, Nonce=`wrongnonce` ❌

## Error Message

If you see: `Nonce mismatch. The stored nonce for device "..." is "...", but you provided "...".`

This means:
- The system found your device
- But the nonce doesn't match
- Use the **stored nonce** shown in the error message

## Solution

1. **If you just registered**: Use the exact nonce from registration
2. **If you changed password**: Use the nonce from your last password change operation
3. **Check the error message**: It will tell you what nonce is actually stored

## Testing Steps

1. Register a new device with a specific nonce (e.g., `qwerty123456`)
2. Note down the nonce you used
3. Login with the **same** nonce
4. If you change password, note the **new** nonce you used
5. For subsequent logins, use the **latest** nonce (from password change, not registration)

