# Catatan Proses Instalasi & Setup Environment
**Project:** Task Tracker App
**Fase:** Minggu 1 - Setup Environment, Git & Perancangan Skema Database

## 1. Instalasi Tools Utama
- **Node.js:** Terinstal versi LTS. Verifikasi berhasil dijalankan menggunakan perintah `node -v` di terminal tanpa error.
- **Database:** MySQL Server telah diinstal dan berjalan dengan baik. Verifikasi berhasil menggunakan perintah `mysql --version`.
- **Version Control:** Git sudah terkonfigurasi. Akses ke GitHub juga sudah diamankan menggunakan autentikasi SSH Key untuk memudahkan *push* dan *pull*.

## 2. Setup Repository & Git Workflow
- Membuat repository baru bernama `task-tracker-app` di GitHub.
- Repository berhasil di-clone ke direktori lokal. 
- Menerapkan konsep *feature branch* dengan membuat dan bekerja di branch `setup/environment` agar tidak mengganggu branch `main` (mencegah *commit* langsung ke *main*).
- Mengonfigurasi file `.gitignore` dengan memasukkan `node_modules/` dan `.env` agar dependensi yang berat dan kredensial sensitif tidak ikut ter-push ke GitHub.

## 3. Desain ERD & Skema Database
- **ERD:** Telah merancang skema relasi untuk 4 tabel utama yaitu `users`, `projects`, `tasks`, dan `task_assignees`.
- **Relasi Many-to-Many (N—N):** Menerapkan tabel pivot `task_assignees` menggunakan *composite primary key* (`task_id`, `user_id`) karena relasi *Foreign Key* biasa tidak cukup untuk menangani kasus di mana satu task bisa dikerjakan banyak user, dan satu user bisa mengerjakan banyak task.
- **Eksekusi Schema:** File `database/schema.sql` berhasil dieksekusi dari keadaan kosong tanpa error. Verifikasi pembentukan tabel dilakukan menggunakan perintah `SHOW TABLES;` dan `DESCRIBE task_assignees;`.
- **Pengujian & Dummy Data:** Sebanyak 1 project, 3 task, dan 3 user telah di-insert sebagai *dummy data*. Uji coba relasi N—N berhasil dilakukan dengan meng-assign 2 user ke 1 task yang sama. Konfigurasi `ON DELETE CASCADE` juga telah diterapkan.
- **Query JOIN:** Query manual menggunakan `JOIN` telah dieksekusi dan sukses mengambil data relasi dengan benar (menampilkan daftar task beserta nama-nama *assignee*-nya).

## 4. Finalisasi
- Semua tahapan telah disimpan (*commit*) dan diunggah (*push*) ke *origin branch* (`setup/environment`).
- *Pull Request* (PR) pertama sukses dibuat, melalui proses *self-review*, dan telah di-*merge* ke branch `main`.