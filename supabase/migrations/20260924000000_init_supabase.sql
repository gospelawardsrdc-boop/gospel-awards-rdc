-- ==============================================================================
-- GOSPEL AWARDS RDC — SCHÉMA POSTGRESQL & ROW LEVEL SECURITY (SUPABASE)
-- Version : 2.1 (Durcie, Isolation Storage Artiste & Vérifiée pour Cloud)
-- Compatibilité : Auth.js (NextAuth) + Prisma ORM + Supabase PostgreSQL + Storage
-- ==============================================================================

-- 1. EXTENSIONS POSTGRESQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CRÉATION DES TABLES (AVEC RESPECT DE LA CASSE PRISMA & TYPES STRICTS)
-- ==============================================================================

-- Table: User (Utilisateurs, Rôles RBAC et Solde de points)
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "emailVerified" TIMESTAMP WITH TIME ZONE,
    "hashedPassword" TEXT,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER' CHECK ("role" IN ('ADMIN', 'ARTIST', 'USER')),
    "pointBalance" INTEGER NOT NULL DEFAULT 0 CHECK ("pointBalance" >= 0),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: Account (NextAuth / Auth.js)
CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId")
);

-- Table: Session (NextAuth / Auth.js)
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "expires" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Table: VerificationToken (NextAuth / Auth.js)
CREATE TABLE IF NOT EXISTS "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expires" TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token")
);

-- Table: Category (16 Catégories officielles)
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: Artist (Profils Artistes Gospel)
CREATE TABLE IF NOT EXISTS "Artist" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "stageName" TEXT NOT NULL,
    "slug" TEXT UNIQUE NOT NULL,
    "biography" TEXT,
    "profileImage" TEXT,
    "coverImage" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: ArtistCategory (Relations N-N Artiste <-> Catégorie)
CREATE TABLE IF NOT EXISTS "ArtistCategory" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "artistId" TEXT NOT NULL REFERENCES "Artist"("id") ON DELETE CASCADE,
    "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "ArtistCategory_artistId_categoryId_key" UNIQUE ("artistId", "categoryId")
);

-- Table: ArtistInvitation (Invitations sécurisées avec activation unique)
CREATE TABLE IF NOT EXISTS "ArtistInvitation" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "artistId" TEXT UNIQUE NOT NULL REFERENCES "Artist"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "activationCode" TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: PasswordResetToken (Réinitialisation mot de passe sécurisée)
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: Competition (Édition Gospel Awards)
CREATE TABLE IF NOT EXISTS "Competition" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "endDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: PointPackage (Les 5 packs officiels : 1k/2pts, 5k/10pts, 10k/20pts, 50k/100pts, 100k/200pts)
CREATE TABLE IF NOT EXISTS "PointPackage" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT UNIQUE NOT NULL,
    "points" INTEGER NOT NULL CHECK ("points" > 0),
    "priceFc" INTEGER NOT NULL CHECK ("priceFc" > 0),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: Transaction (Paiements Mobile Money et commandes de points)
CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id"),
    "packageId" TEXT NOT NULL REFERENCES "PointPackage"("id"),
    "pointsAmount" INTEGER NOT NULL CHECK ("pointsAmount" > 0),
    "amountFc" INTEGER NOT NULL CHECK ("amountFc" > 0),
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: Vote (Votes sécurisés et immuables - Non lisibles publiquement)
CREATE TABLE IF NOT EXISTS "Vote" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id"),
    "artistId" TEXT NOT NULL REFERENCES "Artist"("id"),
    "categoryId" TEXT NOT NULL REFERENCES "Category"("id"),
    "competitionId" TEXT REFERENCES "Competition"("id"),
    "transactionId" TEXT REFERENCES "Transaction"("id"),
    "points" INTEGER NOT NULL CHECK ("points" >= 1),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: ArtistSocialLink (Réseaux sociaux artistes)
CREATE TABLE IF NOT EXISTS "ArtistSocialLink" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "artistId" TEXT NOT NULL REFERENCES "Artist"("id") ON DELETE CASCADE,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL
);

-- Table: ArtistMusicLink (Liens d'écoute musicale)
CREATE TABLE IF NOT EXISTS "ArtistMusicLink" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "artistId" TEXT NOT NULL REFERENCES "Artist"("id") ON DELETE CASCADE,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT
);

-- Table: ArtistVideoLink (Vidéos et prestations clips)
CREATE TABLE IF NOT EXISTS "ArtistVideoLink" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "artistId" TEXT NOT NULL REFERENCES "Artist"("id") ON DELETE CASCADE,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "thumbnail" TEXT,
    "isExcerpt" BOOLEAN NOT NULL DEFAULT false
);

-- Table: ArtistStatistic (Statistiques journalières / agrégées)
CREATE TABLE IF NOT EXISTS "ArtistStatistic" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "artistId" TEXT NOT NULL REFERENCES "Artist"("id") ON DELETE CASCADE,
    "categoryId" TEXT,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "totalVoters" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT "ArtistStatistic_artistId_categoryId_date_key" UNIQUE ("artistId", "categoryId", "date")
);

-- Table: Withdrawal (Demandes et enregistrements de retraits administratifs)
CREATE TABLE IF NOT EXISTS "Withdrawal" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "amountFc" INTEGER NOT NULL CHECK ("amountFc" > 0),
    "provider" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "destinationName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    "reference" TEXT UNIQUE NOT NULL,
    "idempotencyKey" TEXT UNIQUE,
    "note" TEXT,
    "requestedBy" TEXT NOT NULL,
    "processedBy" TEXT,
    "requestedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "processedAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: FinancialAuditLog (Journal d'audit des opérations financières)
CREATE TABLE IF NOT EXISTS "FinancialAuditLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "amountFc" INTEGER,
    "reference" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEX DE PERFORMANCE & DE CONTRAINTE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS "Artist_slug_idx" ON "Artist"("slug");
CREATE INDEX IF NOT EXISTS "Artist_userId_idx" ON "Artist"("userId");
CREATE INDEX IF NOT EXISTS "Category_slug_idx" ON "Category"("slug");
CREATE INDEX IF NOT EXISTS "ArtistCategory_artistId_idx" ON "ArtistCategory"("artistId");
CREATE INDEX IF NOT EXISTS "ArtistCategory_categoryId_idx" ON "ArtistCategory"("categoryId");
CREATE INDEX IF NOT EXISTS "Vote_artistId_idx" ON "Vote"("artistId");
CREATE INDEX IF NOT EXISTS "Vote_categoryId_idx" ON "Vote"("categoryId");
CREATE INDEX IF NOT EXISTS "Vote_userId_idx" ON "Vote"("userId");
CREATE INDEX IF NOT EXISTS "Vote_competitionId_idx" ON "Vote"("competitionId");
CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "Transaction"("userId");
CREATE INDEX IF NOT EXISTS "Transaction_status_idx" ON "Transaction"("status");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");
CREATE INDEX IF NOT EXISTS "ArtistInvitation_token_idx" ON "ArtistInvitation"("token");
CREATE INDEX IF NOT EXISTS "Withdrawal_status_idx" ON "Withdrawal"("status");
CREATE INDEX IF NOT EXISTS "Withdrawal_provider_idx" ON "Withdrawal"("provider");
CREATE INDEX IF NOT EXISTS "Withdrawal_createdAt_idx" ON "Withdrawal"("createdAt");
CREATE INDEX IF NOT EXISTS "FinancialAuditLog_action_idx" ON "FinancialAuditLog"("action");
CREATE INDEX IF NOT EXISTS "FinancialAuditLog_createdAt_idx" ON "FinancialAuditLog"("createdAt");

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES — SÉCURITÉ & ISOLATION COMPLÈTE
-- ==============================================================================

-- Activation systématique du RLS sur TOUTES les tables (19 tables)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Artist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArtistCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArtistInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Competition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PointPackage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArtistSocialLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArtistMusicLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArtistVideoLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ArtistStatistic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Withdrawal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FinancialAuditLog" ENABLE ROW LEVEL SECURITY;

-- Tables Financières d'Administration (Withdrawal & FinancialAuditLog) :
-- Strictement réservées à l'ADMIN et au Service Role (Aucun accès public ou utilisateur standard)
DROP POLICY IF EXISTS "Withdrawal_admin_all" ON "Withdrawal";
CREATE POLICY "Withdrawal_admin_all" ON "Withdrawal"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

DROP POLICY IF EXISTS "FinancialAuditLog_admin_all" ON "FinancialAuditLog";
CREATE POLICY "FinancialAuditLog_admin_all" ON "FinancialAuditLog"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table User :
DROP POLICY IF EXISTS "User_self_read" ON "User";
CREATE POLICY "User_self_read" ON "User"
    FOR SELECT USING (auth.uid()::text = "id");

DROP POLICY IF EXISTS "User_self_update" ON "User";
CREATE POLICY "User_self_update" ON "User"
    FOR UPDATE USING (auth.uid()::text = "id")
    WITH CHECK (auth.uid()::text = "id");

DROP POLICY IF EXISTS "User_admin_all" ON "User";
CREATE POLICY "User_admin_all" ON "User"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Tables Auth.js (Account, Session, VerificationToken) :
DROP POLICY IF EXISTS "Account_user_access" ON "Account";
CREATE POLICY "Account_user_access" ON "Account"
    FOR ALL USING (
        auth.uid()::text = "userId"
        OR auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

DROP POLICY IF EXISTS "Session_user_access" ON "Session";
CREATE POLICY "Session_user_access" ON "Session"
    FOR ALL USING (
        auth.uid()::text = "userId"
        OR auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

DROP POLICY IF EXISTS "VerificationToken_server_only" ON "VerificationToken";
CREATE POLICY "VerificationToken_server_only" ON "VerificationToken"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table Category :
DROP POLICY IF EXISTS "Category_public_read" ON "Category";
CREATE POLICY "Category_public_read" ON "Category"
    FOR SELECT USING ("isActive" = true);

DROP POLICY IF EXISTS "Category_admin_all" ON "Category";
CREATE POLICY "Category_admin_all" ON "Category"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table PointPackage :
DROP POLICY IF EXISTS "PointPackage_public_read" ON "PointPackage";
CREATE POLICY "PointPackage_public_read" ON "PointPackage"
    FOR SELECT USING ("isActive" = true);

DROP POLICY IF EXISTS "PointPackage_admin_all" ON "PointPackage";
CREATE POLICY "PointPackage_admin_all" ON "PointPackage"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table Competition :
DROP POLICY IF EXISTS "Competition_public_read" ON "Competition";
CREATE POLICY "Competition_public_read" ON "Competition"
    FOR SELECT USING ("isActive" = true);

DROP POLICY IF EXISTS "Competition_admin_all" ON "Competition";
CREATE POLICY "Competition_admin_all" ON "Competition"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table Artist :
DROP POLICY IF EXISTS "Artist_public_read" ON "Artist";
CREATE POLICY "Artist_public_read" ON "Artist"
    FOR SELECT USING ("isActive" = true AND "isApproved" = true);

DROP POLICY IF EXISTS "Artist_owner_read_all_status" ON "Artist";
CREATE POLICY "Artist_owner_read_all_status" ON "Artist"
    FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Artist_owner_update" ON "Artist";
CREATE POLICY "Artist_owner_update" ON "Artist"
    FOR UPDATE USING (auth.uid()::text = "userId")
    WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Artist_admin_all" ON "Artist";
CREATE POLICY "Artist_admin_all" ON "Artist"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table ArtistCategory :
DROP POLICY IF EXISTS "ArtistCategory_public_read" ON "ArtistCategory";
CREATE POLICY "ArtistCategory_public_read" ON "ArtistCategory"
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "ArtistCategory_admin_all" ON "ArtistCategory";
CREATE POLICY "ArtistCategory_admin_all" ON "ArtistCategory"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table ArtistInvitation & PasswordResetToken :
DROP POLICY IF EXISTS "ArtistInvitation_admin_only" ON "ArtistInvitation";
CREATE POLICY "ArtistInvitation_admin_only" ON "ArtistInvitation"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

DROP POLICY IF EXISTS "PasswordResetToken_admin_only" ON "PasswordResetToken";
CREATE POLICY "PasswordResetToken_admin_only" ON "PasswordResetToken"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table Transaction :
DROP POLICY IF EXISTS "Transaction_user_read" ON "Transaction";
CREATE POLICY "Transaction_user_read" ON "Transaction"
    FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Transaction_admin_all" ON "Transaction";
CREATE POLICY "Transaction_admin_all" ON "Transaction"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Table Vote :
-- ⚠️ SÉCURITÉ CRITIQUE : LES VOTES INDIVIDUELS NE SONT PAS PUBLIQUEMENT LISIBLES.
DROP POLICY IF EXISTS "Vote_user_read" ON "Vote";
CREATE POLICY "Vote_user_read" ON "Vote"
    FOR SELECT USING (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "Vote_admin_all" ON "Vote";
CREATE POLICY "Vote_admin_all" ON "Vote"
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'ADMIN' 
        OR current_user IN ('postgres', 'supabase_admin') 
        OR current_setting('request.jwt.claim.role', true) = 'service_role'
    );

-- Tables Médias Artistes (Social, Musique, Vidéo) :
DROP POLICY IF EXISTS "ArtistSocialLink_public_read" ON "ArtistSocialLink";
CREATE POLICY "ArtistSocialLink_public_read" ON "ArtistSocialLink" FOR SELECT USING (true);
DROP POLICY IF EXISTS "ArtistSocialLink_admin_all" ON "ArtistSocialLink";
CREATE POLICY "ArtistSocialLink_admin_all" ON "ArtistSocialLink" FOR ALL USING (
    auth.jwt() ->> 'role' = 'ADMIN' 
    OR current_user IN ('postgres', 'supabase_admin') 
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
    OR EXISTS (SELECT 1 FROM "Artist" WHERE "Artist"."id" = "ArtistSocialLink"."artistId" AND "Artist"."userId" = auth.uid()::text)
);

DROP POLICY IF EXISTS "ArtistMusicLink_public_read" ON "ArtistMusicLink";
CREATE POLICY "ArtistMusicLink_public_read" ON "ArtistMusicLink" FOR SELECT USING (true);
DROP POLICY IF EXISTS "ArtistMusicLink_admin_all" ON "ArtistMusicLink";
CREATE POLICY "ArtistMusicLink_admin_all" ON "ArtistMusicLink" FOR ALL USING (
    auth.jwt() ->> 'role' = 'ADMIN' 
    OR current_user IN ('postgres', 'supabase_admin') 
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
    OR EXISTS (SELECT 1 FROM "Artist" WHERE "Artist"."id" = "ArtistMusicLink"."artistId" AND "Artist"."userId" = auth.uid()::text)
);

DROP POLICY IF EXISTS "ArtistVideoLink_public_read" ON "ArtistVideoLink";
CREATE POLICY "ArtistVideoLink_public_read" ON "ArtistVideoLink" FOR SELECT USING (true);
DROP POLICY IF EXISTS "ArtistVideoLink_admin_all" ON "ArtistVideoLink";
CREATE POLICY "ArtistVideoLink_admin_all" ON "ArtistVideoLink" FOR ALL USING (
    auth.jwt() ->> 'role' = 'ADMIN' 
    OR current_user IN ('postgres', 'supabase_admin') 
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
    OR EXISTS (SELECT 1 FROM "Artist" WHERE "Artist"."id" = "ArtistVideoLink"."artistId" AND "Artist"."userId" = auth.uid()::text)
);

-- Table ArtistStatistic :
DROP POLICY IF EXISTS "ArtistStatistic_public_read" ON "ArtistStatistic";
CREATE POLICY "ArtistStatistic_public_read" ON "ArtistStatistic" FOR SELECT USING (true);
DROP POLICY IF EXISTS "ArtistStatistic_admin_all" ON "ArtistStatistic";
CREATE POLICY "ArtistStatistic_admin_all" ON "ArtistStatistic" FOR ALL USING (
    auth.jwt() ->> 'role' = 'ADMIN' 
    OR current_user IN ('postgres', 'supabase_admin') 
    OR current_setting('request.jwt.claim.role', true) = 'service_role'
);

-- ==============================================================================
-- 5. FONCTION RPC ATOMIQUE DE VOTE AVEC PROTECTION CONTRE L'USURPATION
-- ==============================================================================

CREATE OR REPLACE FUNCTION cast_vote_atomic(
    p_user_id TEXT,
    p_artist_id TEXT,
    p_category_id TEXT,
    p_points INTEGER,
    p_competition_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_auth_uid TEXT;
    v_caller_role TEXT;
    v_user_balance INTEGER;
    v_artist_user_id TEXT;
    v_artist_active BOOLEAN;
    v_artist_approved BOOLEAN;
    v_in_category BOOLEAN;
    v_vote_id TEXT;
BEGIN
    -- 1. CONTRÔLE D'ACCÈS & PROTECTION STRICTE CONTRE L'USURPATION DE p_user_id
    v_caller_auth_uid := auth.uid()::text;
    v_caller_role := COALESCE(auth.jwt() ->> 'role', '');

    -- Si appelé via l'API REST / Supabase Client (avec contexte JWT) :
    IF v_caller_auth_uid IS NOT NULL THEN
        -- L'utilisateur connecté ne peut voter QUE pour son propre compte (sauf ADMIN)
        IF v_caller_auth_uid <> p_user_id AND v_caller_role <> 'ADMIN' THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Action non autorisée : usurpation d''identité détectée.'
            );
        END IF;
    ELSE
        -- Si appelé sans JWT direct (ex: backend Server Action Prisma / direct pooler),
        -- autoriser uniquement si l'appelant est superuser postgres ou rôle interne autorisé
        IF current_user NOT IN ('postgres', 'supabase_admin') 
           AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Exécution de vote non autorisée pour ce contexte de connexion.'
            );
        END IF;
    END IF;

    -- 2. VALIDATION STRICTE DU NOMBRE DE POINTS
    IF p_points IS NULL OR p_points < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Le nombre de points doit être supérieur ou égal à 1.');
    END IF;

    -- 3. VÉRIFICATION DE L'EXISTENCE ET DU STATUT DE L'ARTISTE
    SELECT "userId", "isActive", "isApproved"
    INTO v_artist_user_id, v_artist_active, v_artist_approved
    FROM "Artist"
    WHERE "id" = p_artist_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Artiste introuvable.');
    END IF;

    IF NOT v_artist_active OR NOT v_artist_approved THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cet artiste n''est pas éligible au vote actuellement.');
    END IF;

    -- 4. INTERDICTION MATÉRIELLE D'AUTO-VOTE (UN ARTISTE NE PEUT PAS VOTER POUR LUI-MÊME)
    IF v_artist_user_id = p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Vous ne pouvez pas voter pour votre propre candidature.');
    END IF;

    -- 5. VÉRIFICATION QUE L'ARTISTE CONCOURT BIEN DANS LA CATÉGORIE DEMANDÉE
    SELECT EXISTS (
        SELECT 1 FROM "ArtistCategory"
        WHERE "artistId" = p_artist_id AND "categoryId" = p_category_id
    ) INTO v_in_category;

    IF NOT v_in_category THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cet artiste n''est pas inscrit dans cette catégorie.');
    END IF;

    -- 6. DÉBIT CONDITIONNEL ATOMIQUE DU SOLDE UTILISATEUR (VERROUILLAGE PESSIMISTE)
    UPDATE "User"
    SET "pointBalance" = "pointBalance" - p_points,
        "updatedAt" = NOW()
    WHERE "id" = p_user_id AND "pointBalance" >= p_points
    RETURNING "pointBalance" INTO v_user_balance;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Solde de points insuffisant pour effectuer ce vote.');
    END IF;

    -- 7. ENREGISTREMENT ATOMIQUE DU VOTE
    INSERT INTO "Vote" ("id", "userId", "artistId", "categoryId", "competitionId", "points", "createdAt")
    VALUES (gen_random_uuid()::text, p_user_id, p_artist_id, p_category_id, p_competition_id, p_points, NOW())
    RETURNING "id" INTO v_vote_id;

    -- 8. RETOUR DU RÉSULTAT STRUCTURÉ
    RETURN jsonb_build_object(
        'success', true,
        'voteId', v_vote_id,
        'points', p_points,
        'newBalance', v_user_balance,
        'message', p_points || ' point(s) attribué(s) avec succès !'
    );
END;
$$;

-- Révocation des droits publics sur la fonction de vote & attribution ciblée
REVOKE ALL ON FUNCTION cast_vote_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION cast_vote_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION cast_vote_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cast_vote_atomic(TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;

-- ==============================================================================
-- 6. CONFIGURATION SUPABASE STORAGE (BUCKET 'artists-media' & POLICIES DURCIES)
-- ==============================================================================

-- Création / Mise à jour idempotente du bucket 'artists-media'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'artists-media',
    'artists-media',
    true,
    5242880, -- Limite stricte 5 Mo par fichier
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Nettoyage préventif de toutes les anciennes politiques storage
DROP POLICY IF EXISTS "Public_Read_Artists_Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated_Upload_Artists_Media" ON storage.objects;
DROP POLICY IF EXISTS "Owner_Update_Artists_Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated_Update_Artists_Media" ON storage.objects;
DROP POLICY IF EXISTS "Artist_Upload_Artists_Media" ON storage.objects;
DROP POLICY IF EXISTS "Artist_Update_Artists_Media" ON storage.objects;
DROP POLICY IF EXISTS "Admin_Delete_Artists_Media" ON storage.objects;

-- 1. LECTURE PUBLIQUE : Tout visiteur ou utilisateur peut consulter les images d'artistes
CREATE POLICY "Public_Read_Artists_Media" ON storage.objects
    FOR SELECT USING (bucket_id = 'artists-media');

-- 2. TÉLÉVERSEMENT (INSERT) SÉCURISÉ & ISOLÉ :
--    - ADMIN / Service Role : téléversement universel.
--    - ARTIST : téléversement autorisé UNIQUEMENT dans le dossier correspondant à son propre profil d'artiste.
--    - USER ordinaire : strictement interdit de téléverser des médias d'artistes.
CREATE POLICY "Artist_Upload_Artists_Media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'artists-media'
        AND (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp'))
        AND (
            -- ADMIN ou Service Role
            auth.jwt() ->> 'role' = 'ADMIN'
            OR current_user IN ('postgres', 'supabase_admin')
            OR current_setting('request.jwt.claim.role', true) = 'service_role'
            -- ARTIST uniquement pour son propre artiste
            OR (
                (
                    auth.jwt() ->> 'role' = 'ARTIST' 
                    OR EXISTS (SELECT 1 FROM "User" WHERE "User"."id" = auth.uid()::text AND "User"."role" = 'ARTIST')
                )
                AND EXISTS (
                    SELECT 1 FROM "Artist"
                    WHERE "Artist"."userId" = auth.uid()::text
                    AND (
                        (storage.foldername(name))[1] = "Artist"."id"
                        OR (storage.foldername(name))[1] = auth.uid()::text
                        OR (storage.foldername(name))[1] = "Artist"."slug"
                        OR name LIKE ("Artist"."id" || '/%')
                        OR name LIKE (auth.uid()::text || '/%')
                        OR name LIKE ("Artist"."slug" || '/%')
                    )
                )
            )
        )
    );

-- 3. MODIFICATION (UPDATE) SÉCURISÉE & ISOLÉE :
--    - ADMIN / Service Role : modification universelle.
--    - ARTIST : modification autorisée UNIQUEMENT sur ses propres fichiers d'artiste.
--    - USER ordinaire : interdiction totale de modifier les médias d'un artiste.
CREATE POLICY "Artist_Update_Artists_Media" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'artists-media'
        AND (
            -- ADMIN ou Service Role
            auth.jwt() ->> 'role' = 'ADMIN'
            OR current_user IN ('postgres', 'supabase_admin')
            OR current_setting('request.jwt.claim.role', true) = 'service_role'
            -- ARTIST uniquement pour ses propres fichiers
            OR (
                (
                    auth.jwt() ->> 'role' = 'ARTIST' 
                    OR EXISTS (SELECT 1 FROM "User" WHERE "User"."id" = auth.uid()::text AND "User"."role" = 'ARTIST')
                )
                AND (
                    owner::text = auth.uid()::text
                    OR EXISTS (
                        SELECT 1 FROM "Artist"
                        WHERE "Artist"."userId" = auth.uid()::text
                        AND (
                            (storage.foldername(name))[1] = "Artist"."id"
                            OR (storage.foldername(name))[1] = auth.uid()::text
                            OR (storage.foldername(name))[1] = "Artist"."slug"
                            OR name LIKE ("Artist"."id" || '/%')
                            OR name LIKE (auth.uid()::text || '/%')
                            OR name LIKE ("Artist"."slug" || '/%')
                        )
                    )
                )
            )
        )
    );

-- 4. SUPPRESSION (DELETE) : Réservée STRICTEMENT à l'ADMIN et au Service Role
CREATE POLICY "Admin_Delete_Artists_Media" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'artists-media' 
        AND (
            auth.jwt() ->> 'role' = 'ADMIN' 
            OR current_user IN ('postgres', 'supabase_admin') 
            OR current_setting('request.jwt.claim.role', true) = 'service_role'
        )
    );

-- ==============================================================================
-- 7. INITIALISATION DES DONNÉES OFFICIELLES (SEED SQL IDEMPOTENT)
-- ==============================================================================

-- Les 16 Catégories officielles de Gospel Awards RDC
INSERT INTO "Category" ("id", "name", "slug", "description", "icon", "orderIndex", "isActive")
VALUES
    (gen_random_uuid()::text, 'Artiste chrétien de l''année', 'artiste-chretien-annee', 'Récompense l''artiste chrétien ayant le plus marqué l''année par sa musique, son influence et son impact spirituel.', '🏆', 1, true),
    (gen_random_uuid()::text, 'Chanson chrétienne de l''année', 'chanson-chretienne-annee', 'Célèbre la chanson chrétienne qui a le plus touché les cœurs et marqué les esprits durant l''année.', '🎵', 2, true),
    (gen_random_uuid()::text, 'Album chrétien de l''année', 'album-chretien-annee', 'Récompense le meilleur album chrétien de l''année, tant par sa qualité musicale que par son message spirituel.', '💿', 3, true),
    (gen_random_uuid()::text, 'Révélation chrétienne de l''année', 'revelation-chretienne-annee', 'Met en lumière le nouvel artiste chrétien qui s''est distingué par son talent et son potentiel.', '⭐', 4, true),
    (gen_random_uuid()::text, 'Groupe chrétien de l''année', 'groupe-chretien-annee', 'Récompense le groupe de musique chrétienne le plus performant et apprécié de l''année.', '🎸', 5, true),
    (gen_random_uuid()::text, 'Meilleur artiste de louange', 'meilleur-artiste-louange', 'Honore l''artiste qui excelle dans la musique de louange et d''exaltation.', '🙌', 6, true),
    (gen_random_uuid()::text, 'Meilleur artiste d''adoration', 'meilleur-artiste-adoration', 'Récompense l''artiste dont la musique d''adoration touche profondément les âmes.', '🕊️', 7, true),
    (gen_random_uuid()::text, 'Meilleur musicien / instrumentiste chrétien', 'meilleur-musicien-instrumentiste', 'Célèbre l''excellence musicale et la maîtrise instrumentale au service de la musique chrétienne.', '🎹', 8, true),
    (gen_random_uuid()::text, 'Meilleure chorale chrétienne', 'meilleure-chorale-chretienne', 'Récompense la chorale chrétienne la plus talentueuse et inspirante de l''année.', '🎤', 9, true),
    (gen_random_uuid()::text, 'Meilleur featuring chrétien de l''année', 'meilleur-featuring-chretien-annee', 'Célèbre la meilleure collaboration musicale entre artistes chrétiens de la RDC.', '🤝', 10, true),
    (gen_random_uuid()::text, 'Meilleur live concert chrétien de l''année', 'meilleur-live-concert-chretien-annee', 'Récompense la prestation scénique et le concert live gospel le plus marquant.', '🎪', 11, true),
    (gen_random_uuid()::text, 'Meilleur artiste masculin urbain chrétien de l''année', 'meilleur-artiste-masculin-urbain-chretien-annee', 'Honore le meilleur chanteur solo de musique urbaine chrétienne (afrobeats, r&b, afro-gospel).', '🎙️', 12, true),
    (gen_random_uuid()::text, 'Meilleure artiste féminine urbaine chrétienne de l''année', 'meilleure-artiste-feminine-urbaine-chretienne-annee', 'Honore la meilleure chanteuse de musique urbaine chrétienne contemporaine.', '👑', 13, true),
    (gen_random_uuid()::text, 'Meilleure voix masculine chrétienne de l''année', 'meilleure-voix-masculine-chretienne-annee', 'Récompense la puissance vocale et l''excellence technique masculine.', '🦁', 14, true),
    (gen_random_uuid()::text, 'Meilleure voix féminine chrétienne de l''année', 'meilleure-voix-feminine-chretienne-annee', 'Récompense la pureté, la grâce et la virtuosité vocale féminine.', '✨', 15, true),
    (gen_random_uuid()::text, 'Meilleur rappeur chrétien de l''année', 'meilleur-rappeur-chretien-annee', 'Récompense le meilleur artiste de rap et hip-hop gospel de la RDC.', '🔥', 16, true)
ON CONFLICT ("slug") DO UPDATE SET
    "name" = EXCLUDED."name",
    "description" = EXCLUDED."description",
    "icon" = EXCLUDED."icon",
    "orderIndex" = EXCLUDED."orderIndex",
    "isActive" = EXCLUDED."isActive",
    "updatedAt" = NOW();

-- Les 5 Packs de points officiels
INSERT INTO "PointPackage" ("id", "name", "points", "priceFc", "isActive", "orderIndex")
VALUES
    (gen_random_uuid()::text, 'Pack Starter', 2, 1000, true, 1),
    (gen_random_uuid()::text, 'Pack Bronze', 10, 5000, true, 2),
    (gen_random_uuid()::text, 'Pack Silver', 20, 10000, true, 3),
    (gen_random_uuid()::text, 'Pack Gold', 100, 50000, true, 4),
    (gen_random_uuid()::text, 'Pack Diamond', 200, 100000, true, 5)
ON CONFLICT ("name") DO UPDATE SET
    "points" = EXCLUDED."points",
    "priceFc" = EXCLUDED."priceFc",
    "isActive" = EXCLUDED."isActive",
    "orderIndex" = EXCLUDED."orderIndex",
    "updatedAt" = NOW();
