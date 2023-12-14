# mentalwell-backend
Repository ini berisi aplikasi backend dari website MentalWell. Aplikasi ini menyediakan API yang diintegrasikan dengan aplikasi frontend MentalWell.

## Catatan penting
- File aplikasi berlokasi di ./api/index.js dan unit testing aplikasi berlokasi di ./test
- Terdapat file .env.example yang berisi variabel-variabel yang nilainya tidak boleh disertakan
- Jika melakukan clone repository kemudian menjalankan server development dengan perintah `npm run start:dev`, server tidak berjalan dikarenakan URL dan Key dari database yang tidak disertakan
- Terdapat unit testing pada folder test. Jika melakukan clone repository kemudian menjalankan perintah `npm run test`, unit testing akan gagal dikarenakan URL dan Key database tidak disertakan. Jika unit testing berhasil, berikut contoh tangkapan layarnya
[Screenshot Unit Testing](https://drive.google.com/file/d/1oQZTus4-ibT7Hjz9EVx2qBYuWZkRoAkk/view?usp=sharing)

## Menjalankan server development:
1. Instal dependencies dengan `npm install`
2. Jalankan server development dengan `npm run start:dev`

## Dokumentasi API menggunakan Postman
[Dokumentasi API dengan Postman](https://documenter.getpostman.com/view/21036341/2s9Ye8fZx3)
