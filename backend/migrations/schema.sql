-- RecycleCred Complete MySQL Schema
-- Run via: npm run migrate

CREATE DATABASE IF NOT EXISTS recyclecred CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE recyclecred;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  full_name VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  income_level ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  income_factor DECIMAL(3,2) NOT NULL DEFAULT 0.50,
  referral_code VARCHAR(20) NULL,
  referral_flag TINYINT(1) NOT NULL DEFAULT 0,
  awareness_score DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  registered_lat DECIMAL(10,7) NULL,
  registered_lng DECIMAL(10,7) NULL,
  verify_token VARCHAR(255) NULL,
  verify_token_expires DATETIME NULL,
  reset_token VARCHAR(255) NULL,
  reset_token_expires DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS agents (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  full_name VARCHAR(255) NULL,
  phone VARCHAR(20) NULL,
  station_id CHAR(36) NULL,
  partner VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  verify_token VARCHAR(255) NULL,
  verify_token_expires DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_agents_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pricing_params (
  id INT NOT NULL DEFAULT 1,
  alpha DECIMAL(8,2) NOT NULL DEFAULT 150.00,
  c_min DECIMAL(8,2) NOT NULL DEFAULT 200.00,
  m_low DECIMAL(5,4) NOT NULL DEFAULT 1.0500,
  m_high DECIMAL(5,4) NOT NULL DEFAULT 1.3000,
  referral_discount DECIMAL(3,2) NOT NULL DEFAULT 0.30,
  nudge_threshold_seconds INT NOT NULL DEFAULT 3600,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO pricing_params (id, alpha, c_min, m_low, m_high, referral_discount) VALUES (1, 150.00, 200.00, 1.0500, 1.3000, 0.30)
ON DUPLICATE KEY UPDATE id=1;

CREATE TABLE IF NOT EXISTS device_catalogue (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  make VARCHAR(100) NOT NULL,
  model VARCHAR(150) NOT NULL,
  category ENUM('smartphone','laptop','tablet','desktop','tv','other') NOT NULL DEFAULT 'smartphone',
  release_year SMALLINT NOT NULL,
  useful_life_years TINYINT NOT NULL DEFAULT 5,
  omv_kes DECIMAL(10,2) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cat_make_model (make, model)
) ENGINE=InnoDB;

INSERT INTO device_catalogue (id, make, model, category, release_year, useful_life_years, omv_kes) VALUES
  (UUID(),'Samsung','Galaxy A32','smartphone',2021,5,25000.00),
  (UUID(),'Samsung','Galaxy A52','smartphone',2021,5,35000.00),
  (UUID(),'Samsung','Galaxy S21','smartphone',2021,5,85000.00),
  (UUID(),'Apple','iPhone 11','smartphone',2019,5,65000.00),
  (UUID(),'Apple','iPhone 12','smartphone',2020,5,80000.00),
  (UUID(),'Apple','iPhone 13','smartphone',2021,5,95000.00),
  (UUID(),'Apple','iPhone 13 Pro','smartphone',2021,5,120000.00),
  (UUID(),'Google','Pixel 6','smartphone',2021,5,55000.00),
  (UUID(),'Tecno','Camon 18','smartphone',2021,4,8000.00),
  (UUID(),'Infinix','Note 11','smartphone',2021,4,9500.00),
  (UUID(),'Apple','MacBook Pro 2020','laptop',2020,6,150000.00),
  (UUID(),'Dell','XPS 15','laptop',2020,6,120000.00),
  (UUID(),'HP','Pavilion 15','laptop',2021,6,65000.00),
  (UUID(),'Apple','iPad Air 4','tablet',2020,5,65000.00),
  (UUID(),'Samsung','Galaxy Tab A7','tablet',2020,5,25000.00)
ON DUPLICATE KEY UPDATE make=VALUES(make);

CREATE TABLE IF NOT EXISTS devices (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  catalogue_id CHAR(36) NULL,
  imei VARCHAR(20) NULL,
  serial_number VARCHAR(100) NULL,
  make VARCHAR(100) NULL,
  model VARCHAR(150) NULL,
  name VARCHAR(255) NULL,
  device_type VARCHAR(100) NOT NULL DEFAULT 'smartphone',
  release_year SMALLINT NULL,
  t DECIMAL(4,1) NULL,
  n TINYINT NULL,
  D DECIMAL(4,3) NULL,
  omv_kes DECIMAL(10,2) NULL,
  q_screen DECIMAL(3,2) NULL,
  q_body DECIMAL(3,2) NULL,
  q_ports DECIMAL(3,2) NULL,
  q_remote DECIMAL(3,2) NULL,
  q_function DECIMAL(3,2) NULL,
  q_battery DECIMAL(3,2) NULL,
  q_camera DECIMAL(3,2) NULL,
  q_touch DECIMAL(3,2) NULL,
  q_speaker DECIMAL(3,2) NULL,
  q_agent DECIMAL(3,2) NULL,
  q_final DECIMAL(3,2) NULL,
  alpha_used DECIMAL(8,2) NULL,
  income_factor DECIMAL(3,2) NULL,
  proximity_score DECIMAL(3,2) NULL,
  awareness_score DECIMAL(3,2) NULL,
  hoarding_score DECIMAL(3,2) NULL,
  referral_flag TINYINT(1) NULL,
  referral_discount DECIMAL(3,2) NULL,
  beta DECIMAL(10,2) NULL,
  m_low DECIMAL(5,4) NULL,
  m_high DECIMAL(5,4) NULL,
  m_actual DECIMAL(5,4) NULL,
  c_low DECIMAL(10,2) NULL,
  c_high DECIMAL(10,2) NULL,
  c_final DECIMAL(10,2) NULL,
  r_recycler DECIMAL(10,2) NULL,
  platform_margin DECIMAL(10,2) NULL,
  weight_kg DECIMAL(6,3) NOT NULL DEFAULT 0.000,
  data_concern_flag TINYINT(1) NOT NULL DEFAULT 0,
  collection_mode ENUM('drop_off','pickup') NULL,
  imei_match TINYINT(1) NULL,
  submitted_at DATETIME NULL,
  offer_accepted_at DATETIME NULL,
  t_response_seconds INT NULL,
  status ENUM('draft','pending_agent','agent_review','offer_sent','accepted','dropped_off','recycled','rejected') NOT NULL DEFAULT 'draft',
  assigned_agent_id CHAR(36) NULL,
  station_id CHAR(36) NULL,
  scheduled_date DATE NULL,
  cert_data_destruction TINYINT(1) NOT NULL DEFAULT 0,
  photo_front TEXT NULL,
  photo_back TEXT NULL,
  photo_left TEXT NULL,
  photo_right TEXT NULL,
  photo_imei TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_devices_user (user_id),
  KEY idx_devices_status (status),
  KEY idx_devices_agent (assigned_agent_id),
  CONSTRAINT fk_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS wallets (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  currency CHAR(3) NOT NULL DEFAULT 'KES',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wallets_user (user_id),
  CONSTRAINT fk_wallets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  wallet_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  device_id CHAR(36) NULL,
  type ENUM('credit','debit','withdrawal') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  mpesa_ref VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tx_wallet (wallet_id),
  KEY idx_tx_user (user_id),
  CONSTRAINT fk_tx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS stations (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  partner VARCHAR(255) NULL,
  address VARCHAR(500) NULL,
  location VARCHAR(100) NULL,
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  phone VARCHAR(20) NULL,
  operating_hours VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stations_active (active)
) ENGINE=InnoDB;

INSERT INTO stations (id, name, partner, address, location, latitude, longitude, phone, operating_hours) VALUES
  (UUID(),'WEEE Centre Westlands','WEEE Kenya','Mpaka Road, Westlands','Westlands',-1.2631,36.8034,'+254 722 000 001','Mon-Fri 8am-5pm, Sat 9am-1pm'),
  (UUID(),'EWIK Kasarani Drop Point','EWIK','Kasarani Avenue, Kasarani','Kasarani',-1.2195,36.8896,'+254 722 000 002','Mon-Fri 8am-5pm'),
  (UUID(),'WeCollect South B Hub','WeCollect','Mombasa Road, South B','South B',-1.3167,36.8450,'+254 722 000 003','Mon-Sat 8am-6pm'),
  (UUID(),'WEEE Centre Gigiri','WEEE Kenya','UN Avenue, Gigiri','Gigiri',-1.2303,36.8062,'+254 722 000 004','Mon-Fri 9am-4pm'),
  (UUID(),'EWIK Industrial Area','EWIK','Enterprise Road, Industrial Area','Industrial',-1.3031,36.8519,'+254 722 000 005','Mon-Fri 7am-5pm');