import pool from '../config/database.js'

export async function initDatabase() {
  const connection = await pool.getConnection()
  
  try {
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        background_photo VARCHAR(255),
        music_volume INT DEFAULT 60,
        ambient_volume INT DEFAULT 40,
        timer_mode VARCHAR(20) DEFAULT 'countdown',
        duration INT DEFAULT 25,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user (user_id)
      )
    `)

    // Study stats table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_stats (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        today_minutes INT DEFAULT 0,
        total_minutes INT DEFAULT 0,
        completed_pomodoros INT DEFAULT 0,
        streak INT DEFAULT 0,
        last_study_date DATE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user (user_id)
      )
    `)

    // Study plans table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_plans (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        time VARCHAR(50),
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Break records table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS break_records (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        reason VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    // Study sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS study_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        duration_minutes INT DEFAULT 0,
        goal VARCHAR(255),
        scene_name VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    console.log('✅ Database tables initialized')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  } finally {
    connection.release()
  }
}
