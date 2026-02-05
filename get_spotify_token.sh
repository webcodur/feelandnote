#!/bin/bash
CLIENT_ID="fdc6bbebc4204b308aa90cf8a8c26908"
CLIENT_SECRET="ec791cf4e02f40d3a54fe1f3d7dd70bf"
curl -s -X POST "https://accounts.spotify.com/api/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET" | jq -r '.access_token'
