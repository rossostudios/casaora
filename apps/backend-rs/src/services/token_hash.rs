use sha2::{Digest as _, Sha256};

/// Hash a raw token with SHA-256 (the current standard).
pub fn hash_token(raw_token: &str) -> String {
    hex_encode(&Sha256::digest(raw_token.as_bytes()))
}

/// Hash a raw token with legacy SHA-1 (for backward-compatible lookups).
pub fn hash_token_sha1(raw_token: &str) -> String {
    hex_encode(&sha1::Sha1::digest(raw_token.as_bytes()))
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
