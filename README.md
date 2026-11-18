# DigitalWork — Freelance Escrow Frontend

Frontend สำหรับ Smart Contract `FreelanceEscrow` ที่ให้มา พัฒนาด้วย React + Vite + Ethers.js v6

## สิ่งที่มีในโปรเจกต์
- Dashboard สรุปจำนวนงาน งานที่กำลังดำเนินการ ยอด ETH ที่ล็อก และงานสำเร็จ
- สร้างข้อตกลงจ้างงาน (Create Job)
- เชื่อมต่อ MetaMask และตรวจสอบ Network
- ฝาก ETH เข้า Escrow ด้วยจำนวนที่ตกลงไว้
- ส่งงานด้วย URL หรือ SHA-256 File Hash (คำนวณใน Browser)
- อนุมัติและจ่ายเงินให้ Freelancer
- แจ้งข้อพิพาท และหน้า Arbiter สำหรับคืนเงิน/จ่ายเงิน
- อ่าน Job และ Event Logs จาก Smart Contract
- เปิด Transaction บน Sepolia Etherscan

## ความต้องการ
- Node.js 18 ขึ้นไป
- MetaMask
- Smart Contract FreelanceEscrow ที่ Deploy แล้ว
- ETH สำหรับ Gas และ ETH ทดสอบบน Sepolia สำหรับทดสอบธุรกรรม

## วิธีติดตั้งและรัน
```bash
npm install
```
คัดลอก `.env.example` เป็น `.env` แล้วกำหนดค่า:
```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_CHAIN_ID=11155111
VITE_DEPLOYMENT_BLOCK=0
```
จากนั้นรัน:
```bash
npm run dev
```
เปิด URL ที่ Vite แสดง เช่น `http://localhost:5173`

## Build สำหรับนำไปใช้งาน
```bash
npm run build
npm run preview
```
ไฟล์ Production จะอยู่ใน `dist/`

## เชื่อมกับ Smart Contract
Frontend ใช้ ABI ที่ประกาศไว้ใน `src/contract.js` ให้ตรงกับ Contract ที่ส่งมา หากมีการแก้ไข Solidity ต้องตรวจ ABI ใหม่ด้วย

### Network
ค่าเริ่มต้นเป็น Sepolia Testnet (`11155111`) หาก Deploy บนเครือข่ายอื่น ให้เปลี่ยน `VITE_CHAIN_ID` และแก้ URL Etherscan ใน `src/App.jsx` ให้ตรงกับเครือข่ายนั้น

### Arbiter
Arbiter คือ Address ที่ Deploy Contract ตาม `constructor()` ของ Solidity หากเชื่อม Wallet อื่น จะไม่เห็นปุ่มตัดสินข้อพิพาท

### การอัปโหลดไฟล์
เวอร์ชันนี้ไม่ได้อัปโหลดไฟล์ไป Server/IPFS โดยตรง แต่คำนวณ SHA-256 Hash ใน Browser แล้วส่ง Hash ไปบันทึกบน Contract ผู้รับงานต้องมีไฟล์ต้นฉบับเพื่อเปรียบเทียบ Hash หรือใช้ URL จากระบบ Storage ภายนอก เช่น IPFS

## ข้อควรทราบก่อนใช้เงินจริง
- ทดสอบทุก Workflow บน Sepolia ก่อน
- Smart Contract ปัจจุบันไม่มีฟังก์ชันยกเลิกงาน/คืนเงินกรณีหมดกำหนดส่งอัตโนมัติ
- `submitWork` อนุญาตให้ Freelancer ส่ง URL/Hash ใหม่ได้เมื่อสถานะ Funded หรือ Submitted
- การค้นหา Event ใช้ Deployment Block ที่ตั้งใน `.env`; ถ้าเป็น 0 จะค้นหาย้อนหลังประมาณ 50,000 blocks เพื่อจำกัด RPC load
- ไม่ควรนำขึ้น Mainnet ก่อน Audit Smart Contract และทดสอบสิทธิ์/กรณีผิดพลาดครบถ้วน

## Solidity source และกติกาที่ตรวจเพิ่ม
- Source Contract อยู่ที่ `contracts/FreelanceEscrow.sol` ใช้ Solidity `^0.8.24` (เลือก Compiler 0.8.24 ขึ้นไป)
- `submitWork` ต้องส่งก่อนหรือ ณ เวลากำหนดส่ง และอนุญาตให้ส่ง URL/Hash ใหม่ได้ขณะยังไม่อนุมัติ
- เมื่อเลยกำหนดส่ง งานที่ยังอยู่ในสถานะ Funded จะไม่ถูกคืนเงินอัตโนมัติ คู่สัญญาต้องเปิดข้อพิพาทเพื่อให้ Arbiter ตัดสินตาม FR5
- Frontend ตรวจ Chain ID ซ้ำก่อนส่งธุรกรรม เพื่อป้องกันการเซ็นธุรกรรมบนเครือข่ายผิด
- หน้ารายละเอียดจะอัปเดตข้อมูลหลัง Refresh/Transaction ไม่ค้างเป็นข้อมูลเก่า
- ข้อจำกัดการค้นหา Event ยังคงขึ้นกับ RPC และ `VITE_DEPLOYMENT_BLOCK`; ควรใส่ Block ที่ Deploy จริงเพื่อให้ค้นหาประวัติได้ครบและลดภาระ RPC
