# DigitalWork — Freelance Escrow & Smart Payment Platform

**ระบบจ้างงานฟรีแลนซ์และชำระเงินตามผลงานด้วย Smart Contract**

Frontend สำหรับแพลตฟอร์ม Freelance Escrow ที่พัฒนาด้วย **React, Vite และ Ethers.js v6** ทำงานร่วมกับ Smart Contract `FreelanceEscrow` บน Ethereum โดยใช้ระบบ Escrow เป็นตัวกลางในการจัดเก็บเงินค่าจ้าง และควบคุมการจ่ายเงินตามเงื่อนไขของข้อตกลงระหว่างผู้ว่าจ้าง (Client) และผู้รับจ้าง (Freelancer)

โปรเจกต์นี้พัฒนาขึ้นเพื่อแก้ไขปัญหาการไม่ชำระเงินหลังส่งมอบงาน และการไม่ส่งมอบงานตามข้อตกลง โดยนำ Blockchain และ Smart Contract มาใช้เพื่อเพิ่มความโปร่งใส ตรวจสอบธุรกรรมได้ และลดความเสี่ยงในการทำธุรกรรมระหว่างคู่สัญญา

---
วิธีติดตั้งและเริ่มต้นใช้งาน

### ดาวน์โหลดโปรเจกต์

แตกไฟล์ ZIP และเปิดโฟลเดอร์โปรเจกต์ด้วย Visual Studio Code

### ติดตั้ง Dependencies

เปิด Terminal ภายในโฟลเดอร์ที่มีไฟล์ `package.json` แล้วรันคำสั่ง

```bash
npm install
```

### 7.3 ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ใน Root Folder ของโปรเจกต์ โดยกำหนดค่าดังนี้

```env
VITE_CONTRACT_ADDRESS=0x509CA7bcc61fcb7cC7652170d7218Ec84b44Ec91
VITE_CHAIN_ID=11155111
VITE_DEPLOYMENT_BLOCK=0
```
## 1. วัตถุประสงค์ของระบบ

1. เพื่อพัฒนาระบบสร้างข้อตกลงการจ้างงานผ่าน Smart Contract
2. เพื่อจัดเก็บเงินค่าจ้างไว้ในระบบ Escrow ก่อนเริ่มดำเนินงาน
3. เพื่อให้ Freelancer สามารถส่งหลักฐานการส่งมอบงานผ่านระบบได้
4. เพื่อควบคุมการจ่ายเงินเมื่อผู้ว่าจ้างอนุมัติผลงาน
5. เพื่อรองรับการจัดการข้อพิพาทโดยผู้ดูแลระบบ (Arbiter)
6. เพื่อให้ผู้ใช้งานสามารถตรวจสอบสถานะและประวัติธุรกรรมบน Blockchain ได้

## 2. เทคโนโลยีที่ใช้

| เทคโนโลยี | รายละเอียด |
|---|---|
| React | พัฒนา User Interface |
| Vite | เครื่องมือ Build และ Development Server |
| JavaScript | ภาษาที่ใช้พัฒนา Frontend |
| Ethers.js v6 | เชื่อมต่อและเรียกใช้งาน Smart Contract |
| Solidity | พัฒนา Smart Contract |
| Ethereum | Blockchain Network |
| Sepolia | Test Network สำหรับทดสอบระบบ |
| MetaMask | เชื่อมต่อ Wallet และยืนยันธุรกรรม |
| Etherscan | ตรวจสอบ Transaction และ Smart Contract |

## 3. Functional Requirements

ระบบรองรับความต้องการหลักทั้ง 6 ข้อ ดังนี้

### FR1: Create Job — สร้างข้อตกลงการจ้างงาน

ผู้ว่าจ้างสามารถสร้างข้อตกลงการจ้างงาน โดยระบุข้อมูลดังต่อไปนี้

- ชื่อโครงการ (Project Title)
- รายละเอียดงาน (Description)
- จำนวนเงินค่าจ้าง (Amount)
- กำหนดส่งงาน (Deadline)
- Wallet Address ของ Freelancer

เมื่อสร้างสำเร็จ ระบบจะบันทึกข้อมูลลง Smart Contract และกำหนดสถานะเริ่มต้นเป็น `Created`

### FR2: Deposit Payment — ฝากเงินค่าจ้าง

ผู้ว่าจ้างสามารถฝาก ETH เข้าสู่ Smart Contract เพื่อใช้เป็นหลักประกันการชำระเงิน

- ผู้ฝากเงินต้องเป็น Client ของงานนั้น
- จำนวน ETH ต้องตรงกับจำนวนเงินที่ตกลงไว้
- เมื่อฝากเงินสำเร็จ สถานะงานจะเปลี่ยนเป็น `Funded`

### FR3: Submit Work — ส่งมอบผลงาน

Freelancer สามารถบันทึกหลักฐานการส่งมอบงาน เช่น

- URL ของผลงาน
- SHA-256 Hash ของไฟล์ผลงาน

ระบบสามารถคำนวณ SHA-256 Hash ภายใน Browser ได้ โดยไม่จำเป็นต้องอัปโหลดไฟล์ไปยัง Server ของโปรเจกต์โดยตรง

เมื่อส่งงานสำเร็จ สถานะจะเปลี่ยนเป็น `Submitted`

### FR4: Approve & Release Payment — อนุมัติและจ่ายเงิน

ผู้ว่าจ้างสามารถตรวจสอบผลงานและอนุมัติการส่งมอบงานได้

เมื่ออนุมัติแล้ว Smart Contract จะโอน ETH ที่จัดเก็บไว้ใน Escrow ไปยัง Wallet Address ของ Freelancer และเปลี่ยนสถานะเป็น `Completed`

### FR5: Dispute Management — จัดการข้อพิพาท

เมื่อเกิดปัญหาระหว่างคู่สัญญา ทั้ง Client และ Freelancer สามารถแจ้งข้อพิพาทได้

Arbiter ซึ่งเป็นผู้ดูแลที่ได้รับสิทธิ์จาก Smart Contract สามารถพิจารณาผลการตัดสินได้ 2 รูปแบบ

- Release to Freelancer: อนุมัติให้จ่ายเงินแก่ Freelancer
- Refund to Client: คืนเงินให้แก่ Client

เมื่อดำเนินการสำเร็จ สถานะจะเปลี่ยนเป็น `Completed` หรือ `Refunded` ตามผลการตัดสิน

### FR6: Transaction Tracking — ติดตามสถานะธุรกรรม

ผู้ใช้งานสามารถตรวจสอบข้อมูลการจ้างงานและธุรกรรมผ่านหน้าเว็บไซต์ ได้แก่

- รายละเอียดโครงการ
- สถานะของงาน
- จำนวนเงินที่ฝากใน Escrow
- ประวัติการส่งมอบงาน
- ประวัติการชำระเงินและ Event Logs
- Transaction Hash
- ลิงก์สำหรับตรวจสอบธุรกรรมผ่าน Sepolia Etherscan

## 4. ความสามารถของระบบ (System Features)

ระบบประกอบด้วยฟังก์ชันหลักดังต่อไปนี้

- **Dashboard:** แสดงภาพรวมจำนวนงาน งานที่กำลังดำเนินการ ยอด ETH ที่ถูกล็อกไว้ และจำนวนงานที่สำเร็จ
- **Create Job:** สร้างข้อตกลงการจ้างงาน
- **Wallet Connection:** เชื่อมต่อ MetaMask และตรวจสอบ Network
- **Deposit Payment:** ฝาก ETH เข้า Smart Contract
- **Submit Work:** ส่ง URL หรือ SHA-256 Hash ของไฟล์ผลงาน
- **Approve & Release:** อนุมัติและโอนเงินให้ Freelancer
- **Dispute Management:** แจ้งข้อพิพาทและจัดการผลการตัดสินโดย Arbiter
- **Transaction History:** ตรวจสอบ Event Logs และประวัติธุรกรรม
- **Etherscan Integration:** เปิดดูรายละเอียด Transaction บน Sepolia Etherscan

## 5. Workflow การทำงานของระบบ

1. Client เชื่อมต่อ MetaMask และสร้างข้อตกลงการจ้างงาน
2. Client ฝาก ETH ตามจำนวนที่ระบุไว้ในข้อตกลง
3. Freelancer ดำเนินงานและส่งหลักฐานการส่งมอบงาน
4. Client ตรวจสอบผลงานและอนุมัติการรับมอบ
5. Smart Contract โอนเงินให้ Freelancer โดยอัตโนมัติเมื่อได้รับการอนุมัติ
6. หากเกิดข้อพิพาท คู่สัญญาสามารถแจ้ง Arbiter เพื่อพิจารณาคืนเงินหรือจ่ายเงินตามผลการตัดสิน
7. ผู้ใช้งานสามารถตรวจสอบสถานะและ Transaction Hash ผ่านหน้าเว็บไซต์ได้

## 6. ความต้องการก่อนติดตั้ง (Prerequisites)

ก่อนเริ่มใช้งานต้องเตรียมสิ่งต่อไปนี้

- Node.js เวอร์ชัน 18 ขึ้นไป
- npm
- MetaMask Browser Extension
- Smart Contract `FreelanceEscrow` ที่ Deploy แล้ว
- Ethereum Sepolia Test ETH สำหรับทดสอบธุรกรรม
- ETH สำหรับชำระค่า Gas บน Sepolia

คำอธิบายตัวแปร

| ตัวแปร | รายละเอียด |
|---|---|
| `VITE_CONTRACT_ADDRESS` | Address ของ Smart Contract ที่ Deploy บน Sepolia |
| `VITE_CHAIN_ID` | Chain ID ของ Sepolia Testnet |
| `VITE_DEPLOYMENT_BLOCK` | Block Number ที่ Deploy Contract |

**หมายเหตุ:** Contract Address ข้างต้นเป็นค่าที่กำหนดไว้สำหรับโปรเจกต์ ต้องตรวจสอบกับ Contract ที่ Deploy จริงก่อนใช้งาน ส่วน `VITE_DEPLOYMENT_BLOCK` ควรกำหนดเป็น Block Number ที่ Deploy จริง เพื่อให้สามารถค้นหาประวัติ Event ได้ครบถ้วน

### 7.4 เริ่มต้น Development Server

รันคำสั่ง

```bash
npm run dev
```

จากนั้นเปิด URL ที่ Vite แสดงบน Terminal โดยปกติคือ

http://localhost:5173/

## 8. การ Build สำหรับ Production

หากต้องการตรวจสอบและเตรียมไฟล์สำหรับนำไปใช้งาน สามารถรันคำสั่งดังนี้

```bash
npm run build
```

เมื่อติดตั้งและ Build สำเร็จ ไฟล์ Production จะถูกสร้างไว้ในโฟลเดอร์ `dist/`

หากต้องการทดสอบ Production Build ภายในเครื่อง สามารถใช้คำสั่ง

```bash
npm run preview
```

## 9. การเชื่อมต่อ Smart Contract

Frontend ใช้ ABI ที่กำหนดไว้ในไฟล์

`src/contract.js`

เพื่อเชื่อมต่อและเรียกใช้งานฟังก์ชันของ Smart Contract `FreelanceEscrow`

หากมีการเปลี่ยนแปลง Solidity Contract ต้องตรวจสอบ ABI ให้ตรงกับ Contract เวอร์ชันที่ Deploy อยู่เสมอ รวมถึงตรวจสอบ Contract Address ใหม่ก่อนใช้งาน

### 9.1 Network Configuration

ระบบกำหนดค่าเริ่มต้นเป็น Ethereum Sepolia Testnet

- Network: Sepolia
- Chain ID: `11155111`
- Explorer: https://sepolia.etherscan.io/

หากเปลี่ยนไปใช้เครือข่ายอื่น ต้องแก้ไข `VITE_CHAIN_ID`, Contract Address และ URL ของ Blockchain Explorer ให้ตรงกับเครือข่ายนั้น

Frontend มีการตรวจสอบ Chain ID ก่อนส่งธุรกรรม เพื่อช่วยป้องกันการส่งธุรกรรมบนเครือข่ายที่ไม่ถูกต้อง

### 9.2 Arbiter Authorization

Arbiter คือ Wallet Address ของผู้ที่ Deploy Smart Contract โดยกำหนดจาก `msg.sender` ภายใน `constructor()`

ดังนั้น Wallet ที่ใช้เชื่อมต่อกับระบบต้องตรงกับ Arbiter Address จึงจะสามารถเรียกใช้งานฟังก์ชันตัดสินข้อพิพาทได้

### 9.3 การจัดเก็บหลักฐานการส่งมอบงาน

ระบบรองรับการส่งหลักฐานในรูปแบบ URL หรือ SHA-256 Hash

สำหรับการใช้ Hash ระบบจะคำนวณค่าภายใน Browser และส่งผลลัพธ์ไปบันทึกบน Smart Contract

**ข้อจำกัด:** ระบบไม่ได้อัปโหลดไฟล์ไปยัง Server หรือ IPFS โดยตรง ดังนั้นการตรวจสอบ Hash จำเป็นต้องมีไฟล์ต้นฉบับเพื่อคำนวณเปรียบเทียบอีกครั้ง ส่วน URL ควรเป็นลิงก์ที่ผู้เกี่ยวข้องสามารถเข้าถึงได้

## 10. สถานะของงาน (Job Status)

Smart Contract กำหนดสถานะของงานไว้ทั้งหมด 6 สถานะ

| Status | ค่า | ความหมาย |
|---|---:|---|
| `Created` | 0 | สร้างข้อตกลงแล้ว รอฝากเงิน |
| `Funded` | 1 | ฝากเงินแล้ว รอส่งงาน |
| `Submitted` | 2 | ส่งงานแล้ว รอผู้ว่าจ้างตรวจสอบ |
| `Completed` | 3 | อนุมัติและจ่ายเงินแล้ว |
| `Disputed` | 4 | มีการแจ้งข้อพิพาท |
| `Refunded` | 5 | คืนเงินให้ผู้ว่าจ้างแล้ว |

## 11. ข้อกำหนดด้านความปลอดภัยและข้อจำกัด

ระบบมีการกำหนดเงื่อนไขเพื่อป้องกันการทำธุรกรรมที่ไม่ถูกต้อง ได้แก่

- จำกัดสิทธิ์การทำงานตาม Wallet Address ของ Client, Freelancer และ Arbiter
- ตรวจสอบจำนวน ETH ที่ฝากให้ตรงกับข้อตกลง
- ตรวจสอบสถานะก่อนอนุญาตให้ดำเนินธุรกรรม
- ป้องกันการจ่ายเงินซ้ำด้วยการเปลี่ยนสถานะก่อนโอน ETH
- ใช้ Reentrancy Guard ในฟังก์ชันที่มีการโอน ETH
- ตรวจสอบ Chain ID ก่อนส่งธุรกรรม
- ใช้ Event Logs สำหรับติดตามประวัติการทำงานของ Smart Contract

### ข้อจำกัดของระบบ

1. Smart Contract ไม่มีฟังก์ชันยกเลิกงานหรือคืนเงินอัตโนมัติเมื่อหมดกำหนดส่ง
2. เมื่อเลย Deadline งานที่ยังอยู่ในสถานะ `Funded` จะไม่ถูกคืนเงินโดยอัตโนมัติ คู่สัญญาต้องแจ้งข้อพิพาทเพื่อให้ Arbiter พิจารณา
3. ฟังก์ชัน `submitWork` อนุญาตให้ Freelancer ส่งหรือแก้ไข URL/Hash ใหม่ได้เมื่อสถานะเป็น `Funded` หรือ `Submitted` ตามเงื่อนไขของ Contract
4. การค้นหา Event Logs ขึ้นอยู่กับ RPC Provider และช่วง Block ที่กำหนด
5. หาก `VITE_DEPLOYMENT_BLOCK` เป็น `0` ระบบจะค้นหาย้อนหลังประมาณ 50,000 Blocks ตามการตั้งค่าของ Frontend ซึ่งอาจไม่ครอบคลุมประวัติทั้งหมดหาก Contract ถูก Deploy มานานแล้ว
6. การทำงานของระบบต้องอาศัย MetaMask และการเชื่อมต่อกับ Ethereum Network

## 12. Solidity Smart Contract

ไฟล์ Source Code ของ Smart Contract อยู่ที่

`contracts/FreelanceEscrow.sol`

ใช้ภาษา Solidity เวอร์ชันที่กำหนดใน Source Code ดังนี้

```solidity
pragma solidity ^0.8.34;
```

สามารถเลือก Compiler เวอร์ชัน 0.8.34 ขึ้นไป ภายในช่วงที่รองรับตาม Solidity Pragma

หากมีการแก้ไข Smart Contract ต้อง Compile และ Deploy เวอร์ชันใหม่ พร้อมอัปเดต Contract Address และ ABI ใน Frontend ให้ตรงกัน

## 13. การทดสอบระบบ (System Testing)

ควรทดสอบการทำงานของระบบบน Sepolia Testnet ก่อนนำไปใช้งานจริง โดยครอบคลุมกรณีดังต่อไปนี้

| ลำดับ | รายการทดสอบ | ผลที่คาดหวัง |
|---:|---|---|
| 1 | สร้างข้อตกลงการจ้างงาน | สร้าง Job สำเร็จ |
| 2 | ฝาก ETH ตามจำนวนที่ตกลง | สถานะเปลี่ยนเป็น `Funded` |
| 3 | ฝาก ETH ไม่ตรงจำนวน | ธุรกรรมถูกปฏิเสธ |
| 4 | Freelancer ส่งหลักฐานงาน | สถานะเปลี่ยนเป็น `Submitted` |
| 5 | Client อนุมัติผลงาน | เงินถูกโอนให้ Freelancer |
| 6 | พยายามจ่ายเงินซ้ำ | ธุรกรรมถูกปฏิเสธ |
| 7 | คู่สัญญาแจ้งข้อพิพาท | สถานะเปลี่ยนเป็น `Disputed` |
| 8 | Arbiter อนุมัติจ่ายเงิน | เงินถูกโอนให้ Freelancer |
| 9 | Arbiter เลือกคืนเงิน | เงินถูกโอนกลับให้ Client |
| 10 | Wallet ที่ไม่มีสิทธิ์เรียกฟังก์ชัน | ธุรกรรมถูกปฏิเสธ |
| 11 | ตรวจสอบ Transaction Hash | สามารถเปิดดูบน Sepolia Etherscan ได้ |

**หมายเหตุ:** ตารางนี้เป็นรายการกรณีทดสอบและผลลัพธ์ที่คาดหวัง ไม่ใช่การยืนยันว่าทุกกรณีผ่านการทดสอบแล้ว

## 14. สรุป

DigitalWork Freelance Escrow & Smart Payment Platform เป็นระบบจ้างงานออนไลน์ที่นำ Smart Contract บน Ethereum มาใช้จัดการข้อตกลงและการชำระเงินระหว่างผู้ว่าจ้างและฟรีแลนซ์ โดยมีระบบ Escrow ทำหน้าที่จัดเก็บเงินค่าจ้างก่อนส่งมอบงาน และควบคุมการโอนเงินเมื่อผู้ว่าจ้างอนุมัติผลงาน

นอกจากนี้ยังรองรับการแจ้งข้อพิพาท การพิจารณาโดย Arbiter และการตรวจสอบประวัติธุรกรรมผ่าน Blockchain ช่วยเพิ่มความโปร่งใสและความน่าเชื่อถือในการทำธุรกรรมระหว่างคู่สัญญา

โปรเจกต์นี้จึงเป็นการประยุกต์ใช้ Blockchain Technology และ Smart Contract เพื่อแก้ไขปัญหาที่เกิดขึ้นในการจ้างงานออนไลน์ และเป็นพื้นฐานสำหรับการพัฒนาระบบ Freelance Platform ที่มีความปลอดภัยและตรวจสอบได้ในอนาคต

---

**Project:** DigitalWork — Freelance Escrow & Smart Payment Platform  
**Frontend:** React + Vite + Ethers.js v6  
**Smart Contract:** Solidity — FreelanceEscrow  
**Blockchain Network:** Ethereum Sepolia Testnet