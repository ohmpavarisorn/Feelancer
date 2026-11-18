# เปิดเว็บด้วย GitHub Pages

1. สร้าง GitHub repository แบบ **Public** (หากใช้ GitHub Free)
2. อัปโหลด **ไฟล์และโฟลเดอร์ทั้งหมดภายในโปรเจกต์นี้** ไปที่ root ของ repository (ต้องเห็น `package.json`, `index.html`, `.github/` ใน root)
3. ที่ GitHub ไปที่ **Settings → Pages → Build and deployment → Source → GitHub Actions**
4. ไปที่ **Actions** แล้วรอ workflow `Deploy to GitHub Pages` สำเร็จ (หรือกด Run workflow)
5. เปิด `https://USERNAME.github.io/REPOSITORY/` โดยเปลี่ยน USERNAME และ REPOSITORY เป็นชื่อจริง

ไม่ต้องแก้ `.env` เพราะกำหนดค่า Sepolia และ Contract Address เป็นค่าเริ่มต้นใน `src/contract.js` แล้ว (อ้างอิงจาก README เดิม) หาก deploy contract ใหม่จึงค่อยเปลี่ยนค่า.

**ข้อควรทราบ:** หน้าเว็บเปิดได้โดยไม่ติดตั้งอะไร แต่การใช้งาน blockchain ต้องมี MetaMask และเลือก Sepolia; Contract ต้องมีอยู่จริงบน Sepolia. GitHub Pages รองรับเฉพาะ frontend แบบ static ไม่ได้ deploy Solidity contract ให้.
