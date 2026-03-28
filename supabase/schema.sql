-- ============================================================
-- ZERO CGT — Schéma Supabase (PostgreSQL)
-- À exécuter dans : Supabase > SQL Editor
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profils utilisateurs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer le profil automatiquement à l'inscription
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Portefeuilles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Portefeuille de départ',
  type        TEXT NOT NULL DEFAULT 'manual' CHECK (type IN ('manual', 'optimized')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes par user
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- ─── Actifs du portefeuille ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id  UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol        VARCHAR(20)  NOT NULL,
  name          VARCHAR(150) NOT NULL,
  isin          VARCHAR(12),
  type          VARCHAR(10)  NOT NULL CHECK (type IN ('etf', 'stock', 'crypto')),
  quantity      DECIMAL(18, 8) NOT NULL DEFAULT 0,
  weight        DECIMAL(8, 6),
  target_amount DECIMAL(18, 2),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_portfolio_id ON portfolio_assets(portfolio_id);

-- ─── Préférences utilisateur ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  drift_threshold   DECIMAL(5, 2) DEFAULT 5.00,
  email_alerts      BOOLEAN DEFAULT FALSE,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Row Level Security (RLS) ─────────────────────────────────────────────────
-- Chaque utilisateur ne voit QUE ses propres données

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_assets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences  ENABLE ROW LEVEL SECURITY;

-- Policies profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Policies portfolios
CREATE POLICY "Users can view own portfolios"
  ON portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolios"
  ON portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolios"
  ON portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolios"
  ON portfolios FOR DELETE USING (auth.uid() = user_id);

-- Policies portfolio_assets
CREATE POLICY "Users can view own assets"
  ON portfolio_assets FOR SELECT
  USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own assets"
  ON portfolio_assets FOR INSERT
  WITH CHECK (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own assets"
  ON portfolio_assets FOR UPDATE
  USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete own assets"
  ON portfolio_assets FOR DELETE
  USING (portfolio_id IN (SELECT id FROM portfolios WHERE user_id = auth.uid()));

-- Policies preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own preferences"
  ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
