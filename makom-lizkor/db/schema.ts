import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const accounts=sqliteTable('accounts',{id:text('id').primaryKey(),email:text('email').notNull().unique(),salt:text('salt').notNull(),passwordHash:text('password_hash').notNull(),workspaceKey:text('workspace_key'),revision:integer('revision').notNull().default(0),createdAt:integer('created_at').notNull(),emailVerifiedAt:integer('email_verified_at')});
export const sessions=sqliteTable('sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>accounts.id),expiresAt:integer('expires_at').notNull()});
export const rateLimits=sqliteTable('rate_limits',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()});

export const facebookIdentities=sqliteTable('facebook_identities',{facebookId:text('facebook_id').primaryKey(),userId:text('user_id').notNull().unique().references(()=>accounts.id)});
export const facebookStates=sqliteTable('facebook_states',{stateHash:text('state_hash').primaryKey(),userId:text('user_id').references(()=>accounts.id),expiresAt:integer('expires_at').notNull()});

export const googleIdentities=sqliteTable('google_identities',{googleId:text('google_id').primaryKey(),userId:text('user_id').notNull().unique().references(()=>accounts.id)});
export const googleStates=sqliteTable('google_states',{stateHash:text('state_hash').primaryKey(),userId:text('user_id').references(()=>accounts.id),expiresAt:integer('expires_at').notNull(),verifier:text('verifier').notNull(),nonce:text('nonce').notNull()});
export const passwordResets=sqliteTable('password_resets',{email:text('email').primaryKey(),codeHash:text('code_hash').notNull(),attempts:integer('attempts').notNull().default(0),expiresAt:integer('expires_at').notNull()});

// email_verified_at: NULL = new account waiting for its code, 0 = account from before verification existed (not required), >0 = verified at.
export const emailVerifications=sqliteTable('email_verifications',{userId:text('user_id').primaryKey().references(()=>accounts.id),email:text('email').notNull(),codeHash:text('code_hash').notNull(),attempts:integer('attempts').notNull().default(0),expiresAt:integer('expires_at').notNull()});
