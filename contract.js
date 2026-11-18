import { ethers } from "ethers";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "0x509CA7bcc61fcb7cC7652170d7218Ec84b44Ec91";
export const TARGET_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 11155111);
export const DEPLOYMENT_BLOCK = Number(import.meta.env.VITE_DEPLOYMENT_BLOCK || 0);

export const ABI = [
  "function arbiter() view returns (address)",
  "function jobCount() view returns (uint256)",
  "function jobs(uint256) view returns (uint256 id,string title,string description,address client,address freelancer,uint256 amount,uint256 deadline,string deliverable,uint8 status,uint256 createdAt)",
  "function createJob(string _title,string _description,address payable _freelancer,uint256 _amount,uint256 _deadline) returns (uint256)",
  "function depositPayment(uint256 _jobId) payable",
  "function submitWork(uint256 _jobId,string _deliverable)",
  "function approveAndPay(uint256 _jobId)",
  "function raiseDispute(uint256 _jobId)",
  "function resolveDispute(uint256 _jobId,bool _releaseToFreelancer)",
  "event JobCreated(uint256 indexed jobId,address indexed client,address indexed freelancer,uint256 amount,string title)",
  "event PaymentDeposited(uint256 indexed jobId,address indexed client,uint256 amount)",
  "event WorkSubmitted(uint256 indexed jobId,address indexed freelancer,string deliverable)",
  "event PaymentReleased(uint256 indexed jobId,address indexed freelancer,uint256 amount)",
  "event DisputeRaised(uint256 indexed jobId,address indexed raisedBy)",
  "event DisputeResolved(uint256 indexed jobId,address indexed recipient,uint256 amount,bool releasedToFreelancer)"
];

export function getProvider() {
  if (!window.ethereum) throw new Error("ไม่พบ MetaMask กรุณาติดตั้ง MetaMask ก่อนใช้งาน");
  return new ethers.BrowserProvider(window.ethereum);
}
export async function getReadContract() {
  const provider = getProvider();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
}
export async function getWriteContract() {
  const provider = getProvider();
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}
export function shortAddress(address = "") {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "—";
}
export function explainError(error) {
  const msg = error?.shortMessage || error?.reason || error?.message || "เกิดข้อผิดพลาด";
  if (msg.includes("user rejected") || msg.includes("ACTION_REJECTED")) return "คุณยกเลิกรายการในกระเป๋าเงิน";
  if (msg.includes("insufficient funds")) return "ยอด ETH ไม่เพียงพอสำหรับค่าธรรมเนียมและธุรกรรม";
  if (msg.includes("Only arbiter")) return "เฉพาะ Arbiter ที่ Deploy Contract เท่านั้นที่ทำรายการนี้ได้";
  if (msg.includes("Only client")) return "เฉพาะผู้ว่าจ้างเท่านั้นที่ทำรายการนี้ได้";
  if (msg.includes("Only freelancer")) return "เฉพาะฟรีแลนซ์ที่ได้รับมอบหมายเท่านั้นที่ทำรายการนี้ได้";
  if (msg.includes("execution reverted")) return "Smart Contract ปฏิเสธรายการ กรุณาตรวจสอบสถานะงานและสิทธิ์ของ Wallet";
  return msg.slice(0, 220);
}
