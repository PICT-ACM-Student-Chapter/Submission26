-- Neon-compatible version of init.sql
-- Remove \c submission; as we're already connected to neondb

CREATE TYPE years AS ENUM ('FE', 'SE', 'TE', 'BE');

CREATE TABLE users (
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	first_name VARCHAR(255) NOT NULL,
	last_name VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL UNIQUE,
	mobile_number VARCHAR(100) NOT NULL UNIQUE,
	college VARCHAR(255) NOT NULL,
	year years NOT NULL,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL,
	ems_id INT NOT NULL
);

CREATE TABLE user_token (
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	token VARCHAR(255) NOT NULL,
	is_valid BOOLEAN NOT NULL,
	ems_token VARCHAR(256) NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);
   
CREATE TYPE choice AS ENUM ('Technical', 'Non Technical');
CREATE TYPE store AS ENUM ('Online', 'Offline', 'Blended');

CREATE TABLE event (
  id INT PRIMARY KEY,  -- Manually managed primary key (must provide value during insert)
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type TEXT,
  mode text, 
  is_active BOOLEAN NOT NULL,
  play BOOLEAN NOT NULL,
  price INT NOT NULL,
  link VARCHAR(255),
  tagline VARCHAR(255) NOT NULL,
  logo VARCHAR(255) NOT NULL,
  rules TEXT NOT NULL,
  rounds TEXT NOT NULL,
  teams TEXT NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE TABLE submission_event (
    event_id int NOT NULL UNIQUE, -- Set event_id as unique
    event_name text NOT NULL,
    event_route text NOT NULL,
    event_status BOOLEAN,
    CONSTRAINT fk_event FOREIGN KEY(event_id) REFERENCES event(id) ON DELETE CASCADE -- Foreign key constraint
);

CREATE TABLE user_events (
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	fk_event INT NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	CONSTRAINT fk_event FOREIGN KEY(fk_event) REFERENCES event(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE InnoWave(
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE, 
	Innowave_type text not null,
	submission VARCHAR(2048) NOT NULL,
    active_submission BOOLEAN NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE InnoWave2(
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE, 
	Innowave_type text not null,
	submission VARCHAR(2048) NOT NULL,
    active_submission BOOLEAN NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE webapp (
    id INT GENERATED ALWAYS AS IDENTITY UNIQUE, 
	submission VARCHAR(2048) NOT NULL,
    active_submission BOOLEAN NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TYPE paper_type AS ENUM ('Idea Presentation Track', 'Paper Presentation Track');

CREATE TABLE paper (
    id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	type paper_type,
	submission_abstract VARCHAR(2048) NOT NULL,
	submission_paper VARCHAR(2048),
    active_submission BOOLEAN NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE photoshop (
    id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	submission VARCHAR(2048) NOT NULL,
    active_submission BOOLEAN NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE freeze_submission (
    id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	submission VARCHAR(2048) NOT NULL,
    active_submission BOOLEAN NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE insight (
    id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	topic VARCHAR(255) NOT NULL,
	submission TEXT NOT NULL,
    active_submission BOOLEAN NOT NULL,
	fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE dataquest (
    id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
    fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	submission_csv VARCHAR(2048) NOT NULL,
	submission_python VARCHAR(2048) NOT NULL,
	private_accuracy FLOAT NOT NULL,
	public_accuracy FLOAT NOT NULL,
    active_submission BOOLEAN NOT NULL, 
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE dataquest2 (
    id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
    fk_user INT,
	CONSTRAINT fk_user FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	submission_csv VARCHAR(2048) NOT NULL,
	submission_python VARCHAR(2048) NOT NULL,
	private_accuracy FLOAT NOT NULL,
	public_accuracy FLOAT NOT NULL,
	active_submission BOOLEAN NOT NULL,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE Admin(
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	username VARCHAR(255) NOT NULL UNIQUE,
	password VARCHAR(255) NOT NULL,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL
);

CREATE TABLE admin_token (
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	token VARCHAR(255) NOT NULL,
	is_valid BOOLEAN NOT NULL,
	created_at TIMESTAMP NOT NULL,
	updated_at TIMESTAMP NOT NULL,
	fk_admin INT,
	CONSTRAINT fk_admin FOREIGN KEY(fk_admin) REFERENCES Admin(id) ON DELETE CASCADE
);

-- ========================================================
-- New Events Tables (HackNova & Root Cause)
-- ========================================================

CREATE TABLE IF NOT EXISTS hacknova (
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	team_name VARCHAR(255),
	project_title VARCHAR(255),
	submission_file_url VARCHAR(2048),
	github_url VARCHAR(2048),
	live_demo_url VARCHAR(2048),
	notes TEXT,
	active_submission BOOLEAN NOT NULL DEFAULT true,
	fk_user INT,
	CONSTRAINT fk_user_hacknova FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rootcause (
	id INT GENERATED ALWAYS AS IDENTITY UNIQUE,
	team_name VARCHAR(255),
	submission_file_url VARCHAR(2048),
	github_pr_url VARCHAR(2048),
	notes TEXT,
	active_submission BOOLEAN NOT NULL DEFAULT true,
	fk_user INT,
	CONSTRAINT fk_user_rootcause FOREIGN KEY(fk_user) REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMP NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add S3 metadata columns to Freeze the Second if not present
ALTER TABLE freeze_submission 
	ADD COLUMN IF NOT EXISTS photo_title VARCHAR(255),
	ADD COLUMN IF NOT EXISTS camera_device VARCHAR(255),
	ADD COLUMN IF NOT EXISTS description TEXT;

-- Add video and team columns to InnoWave if not present
ALTER TABLE InnoWave 
	ADD COLUMN IF NOT EXISTS video_pitch_url VARCHAR(2048),
	ADD COLUMN IF NOT EXISTS team_name VARCHAR(255),
	ADD COLUMN IF NOT EXISTS changelog TEXT;

-- Seed submission portals for the 4 active events
INSERT INTO submission_event (event_id, event_name, event_route, event_status)
VALUES 
    (20, 'HACKNOVA', '/hacknova', true),
    (10, 'FREEZE THE SECOND', '/freeze', true),
    (12, 'INNOWAVE', '/innowave', true),
    (21, 'ROOT CAUSE', '/rootcause', true)
ON CONFLICT (event_id) 
DO UPDATE SET 
    event_name = EXCLUDED.event_name,
    event_route = EXCLUDED.event_route,
    event_status = EXCLUDED.event_status;

