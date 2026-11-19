import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import {
  Activity, ArrowDownToLine, ArrowUpRight, BadgeCheck, BriefcaseBusiness,
  Check, ChevronDown, CircleAlert, Clock3, FileCheck2, FileUp, FolderKanban,
  BookOpen, LayoutDashboard, Link2, LoaderCircle, Menu, Plus, RefreshCw, Search,
  Shield, ShieldAlert, Sparkles, Wallet, X
} from "lucide-react";
import {
  ABI, CONTRACT_ADDRESS, DEPLOYMENT_BLOCK, TARGET_CHAIN_ID,
  explainError, getProvider, getReadContract, getWriteContract, shortAddress
} from "./contract";

const STATUS = ["Created", "Funded", "Submitted", "Completed", "Disputed", "Refunded"];
const STATUS_TH = ["รอฝากเงิน", "กำลังดำเนินงาน", "รอตรวจรับงาน", "สำเร็จ", "มีข้อพิพาท", "คืนเงินแล้ว"];
const statusClass = (s) => ["created", "funded", "submitted", "completed", "disputed", "refunded"][Number(s)] || "created";
const fmtDate = (v) => new Date(Number(v) * 1000).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
const fmtEth = (v) => Number(ethers.formatEther(v || 0n)).toLocaleString("en-US", { maximumFractionDigits: 5 });
const zero = "0x0000000000000000000000000000000000000000";

function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [arbiter, setArbiter] = useState("");
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", freelancer: "", amount: "", deadline: "" });
  const [deliverable, setDeliverable] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileHash, setFileHash] = useState("");

  const notify = (type, message, tx) => {
    setToast({ type, message, tx });
    window.setTimeout(() => setToast(null), 6500);
  };

  const connect = async () => {
    try {
      const provider = getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      setAccount(accounts[0] || "");
      setChainId(Number(network.chainId));
      notify("success", "เชื่อมต่อ Wallet สำเร็จ");
    } catch (e) { notify("error", explainError(e)); }
  };

  const refresh = useCallback(async () => {
    if (!CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) return;
    setLoading(true);
    try {
      const contract = await getReadContract();
      const [count, admin] = await Promise.all([contract.jobCount(), contract.arbiter()]);
      setArbiter(admin);
      const total = Number(count);
      const ids = Array.from({ length: total }, (_, i) => i + 1);
      const rows = await Promise.all(ids.map(async (id) => {
        const j = await contract.jobs(id);
        return {
          id: Number(j.id), title: j.title, description: j.description,
          client: j.client, freelancer: j.freelancer, amount: j.amount,
          deadline: j.deadline, deliverable: j.deliverable,
          status: Number(j.status), createdAt: j.createdAt
        };
      }));
      const orderedRows = rows.reverse();
      setJobs(orderedRows);
      setSelected(current => current ? (orderedRows.find(row => row.id === current.id) || null) : null);
      try {
        const provider = getProvider();
        const from = DEPLOYMENT_BLOCK > 0 ? DEPLOYMENT_BLOCK : Math.max(0, Number(await provider.getBlockNumber()) - 50000);
        const names = ["JobCreated", "PaymentDeposited", "WorkSubmitted", "PaymentReleased", "DisputeRaised", "DisputeResolved"];
        const logs = await Promise.all(names.map(async (name) => {
          const filter = contract.filters[name]();
          return contract.queryFilter(filter, from, "latest");
        }));
        const flattened = logs.flat().map((log) => ({
          name: log.fragment?.name || "Transaction",
          jobId: log.args?.jobId?.toString() || "",
          hash: log.transactionHash,
          block: log.blockNumber
        })).sort((a,b) => b.block - a.block).slice(0, 30);
        setEvents(flattened);
      } catch { setEvents([]); }
    } catch (e) { notify("error", explainError(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then(async (a) => {
        if (a?.[0]) {
          setAccount(a[0]);
          try { const p = getProvider(); const n = await p.getNetwork(); setChainId(Number(n.chainId)); } catch {}
        }
      }).catch(() => {});
      const onAccounts = (a) => setAccount(a?.[0] || "");
      const onChain = (id) => setChainId(Number(id));
      window.ethereum.on?.("accountsChanged", onAccounts);
      window.ethereum.on?.("chainChanged", onChain);
      return () => {
        window.ethereum.removeListener?.("accountsChanged", onAccounts);
        window.ethereum.removeListener?.("chainChanged", onChain);
      };
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 6500); return () => clearTimeout(t); }, [toast]);

  const isAdmin = account && arbiter && account.toLowerCase() === arbiter.toLowerCase();
  const myJobs = useMemo(() => jobs.filter(j => account && [j.client, j.freelancer].some(a => a.toLowerCase() === account.toLowerCase())), [jobs, account]);
  const filtered = useMemo(() => {
    const base = page === "projects" ? myJobs : page === "disputes" ? jobs.filter(j => j.status === 4) : jobs;
    const q = search.toLowerCase();
    return base.filter(j => `${j.title} ${j.id} ${j.client} ${j.freelancer}`.toLowerCase().includes(q));
  }, [jobs, myJobs, page, search]);

  const transact = async (label, action) => {
    setBusy(label);
    try {
      if (!account) throw new Error("กรุณาเชื่อมต่อ MetaMask ก่อน");
      const provider = getProvider();
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== TARGET_CHAIN_ID) throw new Error(`กรุณาเปลี่ยน MetaMask เป็นเครือข่าย Chain ID ${TARGET_CHAIN_ID} ก่อนทำธุรกรรม`);
      if (!CONTRACT_ADDRESS || !ethers.isAddress(CONTRACT_ADDRESS)) throw new Error("กรุณาตั้งค่า Contract Address ในไฟล์ .env ก่อน");
      const tx = await action();
      notify("pending", "ส่งธุรกรรมแล้ว กำลังรอยืนยันบน Blockchain", tx.hash);
      await tx.wait();
      notify("success", "ทำรายการสำเร็จ", tx.hash);
      await refresh();
      return true;
    } catch (e) { notify("error", explainError(e)); return false; }
    finally { setBusy(""); }
  };

  const createJob = async (e) => {
    e.preventDefault();
    if (!form.deadline) return notify("error", "กรุณาระบุวันกำหนดส่ง");
    const deadline = Math.floor(new Date(form.deadline).getTime() / 1000);
    if (deadline <= Math.floor(Date.now()/1000)) return notify("error", "กำหนดส่งต้องเป็นวันและเวลาในอนาคต");
    if (!ethers.isAddress(form.freelancer) || form.freelancer.toLowerCase() === account.toLowerCase()) return notify("error", "Wallet ฟรีแลนซ์ไม่ถูกต้อง หรือห้ามเป็น Wallet เดียวกับผู้ว่าจ้าง");
    if (!form.title.trim() || !form.description.trim() || !form.amount || !Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) return notify("error", "กรุณากรอกชื่อ รายละเอียด และค่าจ้าง ETH ให้ถูกต้อง");
    try { ethers.parseEther(form.amount); } catch { return notify("error", "จำนวน ETH ไม่ถูกต้อง หรือมีทศนิยมเกิน 18 ตำแหน่ง"); }
    const ok = await transact("create", async () => {
      const c = await getWriteContract();
      return c.createJob(form.title, form.description, form.freelancer, ethers.parseEther(form.amount), deadline);
    });
    if (ok) { setShowCreate(false); setForm({ title:"", description:"", freelancer:"", amount:"", deadline:"" }); }
  };

  const doAction = async (type, job) => {
    const actions = {
      deposit: async c => c.depositPayment(job.id, { value: job.amount }),
      approve: async c => c.approveAndPay(job.id),
      dispute: async c => c.raiseDispute(job.id),
      resolvePay: async c => c.resolveDispute(job.id, true),
      resolveRefund: async c => c.resolveDispute(job.id, false),
      submit: async c => c.submitWork(job.id, deliverable.trim())
    };
    if (type === "submit" && !deliverable.trim()) return notify("error", "กรุณาใส่ URL หรือ File Hash ก่อนส่งงาน");
    if (type === "resolvePay" || type === "resolveRefund") {
      if (!window.confirm(type === "resolvePay" ? "ยืนยันตัดสินให้จ่ายเงินแก่ฟรีแลนซ์?" : "ยืนยันคืนเงินให้ผู้ว่าจ้าง?")) return;
    }
    const ok = await transact(type, async () => actions[type](await getWriteContract()));
    if (ok && type === "submit") setDeliverable("");
  };

  const chooseFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      const hash = "0x" + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,"0")).join("");
      setFileHash(hash);
      setDeliverable(hash);
      notify("success", "สร้าง SHA-256 File Hash สำเร็จ");
    } catch { notify("error", "เบราว์เซอร์ไม่รองรับการคำนวณ Hash"); }
  };

  const openJob = (job) => { setSelected(job); setDeliverable(job.deliverable || ""); };
  const nav = [
    { id:"dashboard", label:"ภาพรวม", icon:LayoutDashboard },
    { id:"projects", label:"โปรเจกต์ของฉัน", icon:FolderKanban },
    { id:"disputes", label:"ข้อพิพาท", icon:ShieldAlert },
    { id:"activity", label:"ประวัติธุรกรรม", icon:Activity },
    { id:"guide", label:"คู่มือใช้งาน", icon:BookOpen }
  ];

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand"><div className="brand-mark"><BriefcaseBusiness size={21}/></div><div><b>DigitalWork</b><small>ESCROW PLATFORM</small></div><button className="mobile-close" onClick={()=>setMobileNav(false)}><X size={18}/></button></div>
      <div className="workspace"><div className="workspace-icon">DW</div><div><b>DigitalWork Studio</b><small>Workspace หลัก</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(n => <button key={n.id} className={`nav-item ${page===n.id?"active":""}`} onClick={()=>{setPage(n.id);setMobileNav(false);setSelected(null)}}><n.icon size={18}/><span>{n.label}</span>{n.id==="disputes" && jobs.some(j=>j.status===4) && <i className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="security-card"><div className="security-icon"><Shield size={17}/></div><b>Secure Escrow</b><p>การชำระเงินถูกควบคุมด้วย Smart Contract บน Ethereum</p><span>Ethereum Sepolia Testnet</span></div>
        <div className="profile-mini"><div className="avatar">{account ? account.slice(2,4).toUpperCase() : "DW"}</div><div><b>{account ? shortAddress(account) : "Guest User"}</b><small>{isAdmin ? "Administrator / Arbiter" : "Connected Wallet"}</small></div><button title="เชื่อมต่อ Wallet" onClick={connect}><Wallet size={17}/></button></div>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="top-left"><button className="mobile-menu" onClick={()=>setMobileNav(true)}><Menu/></button><div className="breadcrumb">Workspace <span>/</span> <b>{nav.find(n=>n.id===page)?.label || "รายละเอียดโปรเจกต์"}</b></div></div>
        <div className="top-actions">
          <div className={`network-pill ${chainId===TARGET_CHAIN_ID?"":"warning"}`}><span className="green-dot"/>{chainId===TARGET_CHAIN_ID?"Sepolia Testnet":chainId ? `Chain ${chainId}` : "ยังไม่เชื่อมต่อ"}</div>
          <button className="wallet-btn" onClick={connect}><Wallet size={16}/>{account?shortAddress(account):"Connect Wallet"}</button>
        </div>
      </header>

      <div className="content">
        {!account && <div className="guest-notice"><Wallet size={19}/><span>เชื่อมต่อ MetaMask บน Sepolia เพื่อดูข้อมูลงานและทำธุรกรรม</span><button onClick={()=>{setPage("guide");setSelected(null)}}>ดูคู่มือใช้งาน</button></div>}
        
        {chainId && chainId !== TARGET_CHAIN_ID && <div className="config-alert warning-alert"><CircleAlert/><div><b>เครือข่ายไม่ตรงกับที่ตั้งค่าไว้</b><p>กรุณาเปลี่ยน Network ใน MetaMask เป็น Chain ID {TARGET_CHAIN_ID} เพื่อทำธุรกรรม</p></div></div>}

        {selected ? <JobDetail job={selected} account={account} isAdmin={isAdmin} busy={busy} deliverable={deliverable} setDeliverable={setDeliverable} fileName={fileName} chooseFile={chooseFile} onBack={()=>setSelected(null)} onAction={doAction}/> :
        <>
          <div className="page-heading"><div><div className="eyebrow"><Sparkles size={13}/> FREELANCE WORKSPACE</div><h1>{page==="dashboard"?"จัดการงานของคุณ":page==="projects"?"โปรเจกต์ของฉัน":page==="disputes"?"ศูนย์จัดการข้อพิพาท":page==="guide"?"คู่มือใช้งาน":"ประวัติธุรกรรม"}</h1><p>{page==="dashboard"?"ติดตามโปรเจกต์ การชำระเงิน และความคืบหน้าทั้งหมดในที่เดียว":"จัดการธุรกรรมการจ้างงานผ่าน Smart Contract อย่างโปร่งใส"}</p></div>
            <div className="heading-actions"><button className="icon-btn" onClick={refresh} title="Refresh"><RefreshCw size={17} className={loading?"spin":""}/></button><button className="primary-btn" onClick={()=>setShowCreate(true)}><Plus size={17}/> สร้างโปรเจกต์</button></div>
          </div>

          {page==="dashboard" && <>
            <div className="welcome-banner"><div className="banner-copy"><span className="banner-tag"><Sparkles size={12}/> FREELANCE ESCROW · SEPOLIA TESTNET</span><h2>ไอเดียที่ดี<br/><em>เริ่มด้วยความเชื่อใจ</em></h2><p>สร้างข้อตกลง ฝากค่าจ้าง และส่งมอบงานอย่างโปร่งใสบนบล็อกเชน</p><button onClick={()=>setShowCreate(true)}>เริ่มสร้างโปรเจกต์ <ArrowUpRight size={16}/></button></div><div className="banner-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-card"><div className="art-card-top"><span>ESCROW BALANCE</span><ShieldCheckIcon/><div className="art-amount">Ξ ETH</div><small>Protected by Smart Contract</small></div><div className="art-card-bottom"><span>SECURE PAYMENT</span><BadgeCheck size={17}/></div></div><div className="floating-check"><Check size={20}/></div></div></div>
            <div className="stats-grid">
              <Stat icon={BriefcaseBusiness} label="โปรเจกต์ทั้งหมด" value={jobs.length} hint="On-chain projects" tone="blue"/>
              <Stat icon={Clock3} label="กำลังดำเนินงาน" value={jobs.filter(j=>j.status===1||j.status===2).length} hint="Funded / Submitted" tone="purple"/>
              <Stat icon={Wallet} label="ยอดเงินใน Escrow" value={`${jobs.filter(j=>j.status===1||j.status===2||j.status===4).reduce((s,j)=>s+Number(ethers.formatEther(j.amount)),0).toLocaleString("en-US",{maximumFractionDigits:4})} ETH`} hint="Funds currently locked" tone="green"/>
              <Stat icon={BadgeCheck} label="งานที่สำเร็จ" value={jobs.filter(j=>j.status===3).length} hint="Successfully completed" tone="orange"/>
            </div>
            <div className="section-head"><div><h3>โปรเจกต์ล่าสุด</h3><p>รายการงานที่ถูกบันทึกบน Blockchain</p></div><button className="text-btn" onClick={()=>setPage("projects")}>ดูทั้งหมด <ArrowUpRight size={15}/></button></div>
            <ProjectTable jobs={jobs.slice(0,5)} onOpen={openJob}/>
            <div className="bottom-grid"><div className="panel"><div className="panel-head"><div><h3>ขั้นตอนการทำงาน</h3><p>ระบบ Escrow ทำงานอย่างไร</p></div><Shield size={19}/></div><div className="steps-row"><Step n="01" title="Create" desc="สร้างข้อตกลง"/><Step n="02" title="Deposit" desc="ฝาก ETH"/><Step n="03" title="Submit" desc="ส่งมอบงาน"/><Step n="04" title="Release" desc="อนุมัติจ่ายเงิน"/></div></div><div className="panel help-panel"><div className="help-icon"><ShieldCheckIcon/></div><div><h3>Protected by Smart Contract</h3><p>เงินจะถูกล็อกไว้จนกว่าจะผ่านเงื่อนไขการอนุมัติ หรือการตัดสินข้อพิพาท</p></div></div></div>
          </>}

          {page==="projects" && <><div className="filter-bar"><div className="search-box"><Search size={17}/><input placeholder="ค้นหาชื่อโปรเจกต์, ID หรือ Wallet..." value={search} onChange={e=>setSearch(e.target.value)}/></div><span className="muted">{filtered.length} projects</span></div><ProjectTable jobs={filtered} onOpen={openJob}/></>}
          {page==="disputes" && <><div className="info-strip"><ShieldAlert size={19}/><span>รายการโปรเจกต์ที่ถูกแจ้งข้อพิพาท ผู้ดูแลระบบ (Arbiter) สามารถพิจารณาจ่ายเงินหรือคืนเงินได้</span></div><ProjectTable jobs={filtered} onOpen={openJob}/></>}
          {page==="guide" && <section className="panel usage-guide" aria-label="คู่มือใช้งาน DigitalWork">
            <h2>เริ่มต้นใช้งาน DigitalWork</h2>
            <p>เว็บไซต์นี้ใช้เครือข่าย Sepolia สำหรับทดลอง Smart Contract โปรดตรวจสอบที่อยู่สัญญา เครือข่าย และรายละเอียดในกระเป๋าก่อนยืนยันทุกธุรกรรม</p>
            <ol>
              <li><strong>เตรียมกระเป๋า</strong> ติดตั้ง MetaMask เพิ่มเครือข่าย Sepolia และเตรียม Sepolia test ETH สำหรับค่าธรรมเนียมและการทดลองฝากเงิน</li>
              <li><strong>เชื่อมต่อ</strong> กด Connect Wallet และเลือกบัญชีที่ต้องการใช้งาน หากเครือข่ายไม่ตรงให้เปลี่ยนใน MetaMask</li>
              <li><strong>ผู้ว่าจ้างสร้างงาน</strong> กดสร้างโปรเจกต์ กรอกชื่องาน รายละเอียด Wallet ของฟรีแลนซ์ ค่าจ้างและกำหนดส่ง แล้วยืนยันธุรกรรม</li>
              <li><strong>ผู้ว่าจ้างฝากเงิน</strong> เปิดรายละเอียดงานแล้วกด Deposit ฝาก ETH ตามจำนวนที่ตกลงไว้ งานจึงเปลี่ยนเป็น Funded</li>
              <li><strong>ฟรีแลนซ์ส่งงาน</strong> เปิดงานที่ได้รับมอบหมาย กรอกลิงก์ผลงาน หรือเลือกไฟล์เพื่อคำนวณ SHA-256 ในเบราว์เซอร์ จากนั้นยืนยันการส่งงาน</li>
              <li><strong>ตรวจและจ่าย</strong> ผู้ว่าจ้างตรวจหลักฐานและกดอนุมัติจ่ายเงิน สถานะงานจะเปลี่ยนเป็น Completed หลังธุรกรรมสำเร็จ</li>
              <li><strong>ข้อพิพาทและประวัติ</strong> คู่สัญญาแจ้งข้อพิพาทได้ และ Arbiter ที่สัญญากำหนดเท่านั้นที่ตัดสินจ่ายหรือคืนเงิน ตรวจสอบธุรกรรมผ่านเมนูประวัติและลิงก์ Etherscan</li>
            </ol>
            <p>หากข้อมูลไม่ปรากฏ ให้ตรวจสอบ MetaMask, เครือข่าย Sepolia และที่อยู่ Smart Contract ที่ตั้งค่าไว้ แล้วกด Refresh</p>
          </section>}
          {page==="activity" && <div className="panel"><div className="panel-head"><div><h3>On-chain Activity</h3><p>Event logs จาก Smart Contract</p></div><Activity size={19}/></div>{events.length ? <div className="activity-list">{events.map((ev,i)=><div className="activity-item" key={`${ev.hash}-${i}`}><div className="activity-icon"><Activity size={16}/></div><div className="activity-main"><b>{eventLabel(ev.name)} · Job #{ev.jobId}</b><small>Block #{ev.block}</small></div><a href={`https://sepolia.etherscan.io/tx/${ev.hash}`} target="_blank" rel="noreferrer">{shortAddress(ev.hash)} <ArrowUpRight size={13}/></a></div>)}</div>:<Empty title="ยังไม่มีประวัติธุรกรรม" desc="เมื่อมีการทำรายการบน Smart Contract ประวัติจะแสดงที่นี่"/>}</div>}
        </>}
      </div>
      <footer className="footer"><span>© 2026 DigitalWork Solutions</span><span>Ethereum · Sepolia Testnet</span></footer>
    </main>

    {showCreate && <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&setShowCreate(false)}><div className="modal"><div className="modal-head"><div><span className="eyebrow">NEW AGREEMENT</span><h2>สร้างข้อตกลงการจ้างงาน</h2><p>รายละเอียดจะถูกบันทึกลง Smart Contract</p></div><button className="icon-btn" onClick={()=>setShowCreate(false)}><X/></button></div><form onSubmit={createJob}><label>ชื่อโปรเจกต์<input required maxLength="100" placeholder="เช่น Website Development" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>รายละเอียดงาน<textarea required rows="3" placeholder="อธิบายขอบเขตงานและสิ่งที่ต้องส่งมอบ..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Freelancer Wallet Address<input required placeholder="0x..." value={form.freelancer} onChange={e=>setForm({...form,freelancer:e.target.value})}/></label><div className="form-two"><label>ค่าจ้าง (ETH)<input required type="number" min="0.000001" step="any" placeholder="0.05" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>กำหนดส่งงาน<input required type="datetime-local" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></label></div><div className="modal-note"><Shield size={16}/> การสร้างข้อตกลงจะยังไม่ล็อกเงิน คุณต้องกด Deposit หลังสร้างงาน</div><button className="primary-btn full-btn" disabled={!!busy}>{busy==="create"?<LoaderCircle className="spin"/>:<Plus size={17}/>} {busy==="create"?"กำลังสร้าง...":"Create Agreement"}</button></form></div></div>}

    {toast && <div className={`toast ${toast.type}`}><div className="toast-symbol">{toast.type==="success"?<Check/>:toast.type==="pending"?<LoaderCircle className="spin"/>:<CircleAlert/>}</div><div><b>{toast.message}</b>{toast.tx && <a href={`https://sepolia.etherscan.io/tx/${toast.tx}`} target="_blank" rel="noreferrer">ดู Transaction บน Etherscan <ArrowUpRight size={12}/></a>}</div><button onClick={()=>setToast(null)}><X size={16}/></button></div>}
  </div>;
}

function ShieldCheckIcon(){return <div className="shield-check"><Shield size={24}/><Check size={12}/></div>}
function Stat({icon:Icon,label,value,hint,tone}){return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>}
function Step({n,title,desc}){return <div className="step"><span>{n}</span><b>{title}</b><small>{desc}</small></div>}
function eventLabel(n){return ({JobCreated:"สร้างโปรเจกต์",PaymentDeposited:"ฝากเงินเข้า Escrow",WorkSubmitted:"ส่งมอบงาน",PaymentReleased:"จ่ายเงินสำเร็จ",DisputeRaised:"แจ้งข้อพิพาท",DisputeResolved:"ตัดสินข้อพิพาท"})[n]||n}
function Empty({title,desc}){return <div className="empty"><div><FolderKanban size={25}/></div><b>{title}</b><p>{desc}</p></div>}

function ProjectTable({jobs,onOpen}){
  if(!jobs.length) return <div className="panel"><Empty title="ยังไม่มีโปรเจกต์" desc="สร้างข้อตกลงการจ้างงานเพื่อเริ่มต้นใช้งาน Freelance Escrow"/></div>;
  return <div className="table-wrap"><table><thead><tr><th>โปรเจกต์</th><th>Job ID</th><th>Freelancer</th><th>มูลค่า</th><th>กำหนดส่ง</th><th>สถานะ</th><th></th></tr></thead><tbody>{jobs.map(j=><tr key={j.id} onClick={()=>onOpen(j)}><td><div className="project-name"><div className="project-avatar">{j.title.slice(0,1).toUpperCase()}</div><div><b>{j.title}</b><small>Created {fmtDate(j.createdAt)}</small></div></div></td><td><span className="job-id">#{j.id}</span></td><td><span className="address-text">{shortAddress(j.freelancer)}</span></td><td><b className="amount">{fmtEth(j.amount)} ETH</b></td><td>{fmtDate(j.deadline)}</td><td><span className={`status ${statusClass(j.status)}`}><i/>{STATUS_TH[j.status]}</span></td><td><button className="row-arrow"><ArrowUpRight size={16}/></button></td></tr>)}</tbody></table></div>
}

function JobDetail({job,account,isAdmin,busy,deliverable,setDeliverable,fileName,chooseFile,onBack,onAction}){
  const isClient=account&&job.client.toLowerCase()===account.toLowerCase();
  const isFreelancer=account&&job.freelancer.toLowerCase()===account.toLowerCase();
  const isParty=isClient||isFreelancer;
  const [copied,setCopied]=useState(false);
  const copy = async (v)=>{await navigator.clipboard.writeText(v);setCopied(true);setTimeout(()=>setCopied(false),1500)};
  const canDeposit=isClient&&job.status===0;
  const canSubmit=isFreelancer&&(job.status===1||job.status===2);
  const canApprove=isClient&&job.status===2;
  const canDispute=isParty&&(job.status===1||job.status===2);
  const canResolve=isAdmin&&job.status===4;
  return <div className="detail-page">
    <button className="back-btn" onClick={onBack}>← กลับไปยังรายการโปรเจกต์</button>
    <div className="detail-heading"><div><div className="eyebrow">PROJECT DETAILS · #{job.id}</div><h1>{job.title}</h1><p>สร้างเมื่อ {fmtDate(job.createdAt)}</p></div><span className={`status large ${statusClass(job.status)}`}><i/>{STATUS_TH[job.status]}</span></div>
    <div className="detail-grid"><div className="detail-main">
      <div className="panel"><div className="panel-head"><div><h3>รายละเอียดข้อตกลง</h3><p>ข้อมูลที่จัดเก็บอยู่บน Blockchain</p></div><FileCheck2 size={19}/></div><p className="description-text">{job.description}</p><div className="detail-meta"><div><small>ค่าจ้างที่ตกลง</small><b className="big-amount">{fmtEth(job.amount)} ETH</b></div><div><small>กำหนดส่งงาน</small><b>{fmtDate(job.deadline)}</b></div><div><small>Job ID</small><b>#{job.id}</b></div></div></div>
      <div className="panel"><div className="panel-head"><div><h3>การส่งมอบงาน</h3><p>URL หรือ Hash ของไฟล์งาน</p></div><FileUp size={19}/></div>{job.deliverable?<div className="deliverable-box"><Link2 size={17}/><span>{job.deliverable}</span><button onClick={()=>copy(job.deliverable)}>{copied?<Check size={15}/>:<ArrowUpRight size={15}/>}</button></div>:<p className="muted">ยังไม่มีการส่งมอบงาน</p>}
        {canSubmit&&<div className="submit-area"><label>ส่ง URL / File Hash<textarea rows="2" value={deliverable} onChange={e=>setDeliverable(e.target.value)} placeholder="วาง URL ของผลงาน หรือเลือกไฟล์เพื่อสร้าง SHA-256 Hash"/></label><label className="upload-label"><input type="file" onChange={e=>chooseFile(e.target.files?.[0])}/><FileUp size={16}/> เลือกไฟล์เพื่อสร้าง Hash {fileName&&<small>{fileName}</small>}</label><button className="primary-btn" disabled={!!busy} onClick={()=>onAction("submit",job)}>{busy==="submit"?<LoaderCircle className="spin"/>:<FileCheck2 size={16}/>} Submit Work</button></div>}
      </div>
      <div className="panel"><div className="panel-head"><div><h3>กิจกรรมของโปรเจกต์</h3><p>ลำดับการทำงานตามสถานะ Smart Contract</p></div><Activity size={19}/></div><div className="timeline">{["สร้างข้อตกลง","ฝากเงินเข้า Escrow","ส่งมอบงาน","อนุมัติและจ่ายเงิน"].map((s,i)=>{const done=job.status===3?true:job.status===5?i<2:job.status===4?i<2:job.status>=i+1;return <div className={`timeline-item ${done?"done":""}`} key={s}><div className="timeline-dot">{done?<Check size={13}/>:i+1}</div><div><b>{s}</b><small>{["JobCreated","PaymentDeposited","WorkSubmitted","PaymentReleased"][i]}</small></div></div>})}</div></div>
    </div><div className="detail-side">
      <div className="panel action-panel"><h3>จัดการโปรเจกต์</h3><p>รายการที่คุณสามารถดำเนินการได้</p>
        {canDeposit&&<ActionButton icon={ArrowDownToLine} title="Deposit Payment" desc={`ฝาก ${fmtEth(job.amount)} ETH เข้า Escrow`} onClick={()=>onAction("deposit",job)} busy={busy==="deposit"}/>}
        {canApprove&&<ActionButton icon={BadgeCheck} title="Approve & Release" desc="ยืนยันรับงานและจ่ายเงินให้ฟรีแลนซ์" onClick={()=>onAction("approve",job)} busy={busy==="approve"} primary/>}
        {canDispute&&<ActionButton icon={ShieldAlert} title="Raise Dispute" desc="แจ้งปัญหาเพื่อให้ Arbiter พิจารณา" onClick={()=>onAction("dispute",job)} busy={busy==="dispute"} danger/>}
        {canResolve&&<><div className="admin-label">ARBITER CONTROL</div><ActionButton icon={Check} title="Release to Freelancer" desc="ตัดสินจ่ายเงินให้ฟรีแลนซ์" onClick={()=>onAction("resolvePay",job)} busy={busy==="resolvePay"} primary/><ActionButton icon={ArrowDownToLine} title="Refund to Client" desc="ตัดสินคืนเงินให้ผู้ว่าจ้าง" onClick={()=>onAction("resolveRefund",job)} busy={busy==="resolveRefund"} danger/></>}
        {!canDeposit&&!canSubmit&&!canApprove&&!canDispute&&!canResolve&&<div className="no-action"><Shield size={22}/><b>ไม่มีรายการที่ต้องดำเนินการ</b><small>ตรวจสอบสิทธิ์ Wallet และสถานะของโปรเจกต์</small></div>}
      </div>
      <div className="panel parties-panel"><h3>คู่สัญญา</h3><Party label="ผู้ว่าจ้าง (Client)" address={job.client}/><Party label="ฟรีแลนซ์ (Freelancer)" address={job.freelancer}/></div>
      <div className="panel escrow-note"><Shield size={19}/><b>Escrow Protection</b><p>เงินจะถูกโอนตามเงื่อนไขใน Smart Contract เท่านั้น ไม่สามารถถอนออกโดยพลการได้</p></div>
    </div></div>
  </div>
}
function Party({label,address}){return <div className="party"><div className="avatar">{address.slice(2,4).toUpperCase()}</div><div><small>{label}</small><b>{shortAddress(address)}</b></div><a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noreferrer"><ArrowUpRight size={14}/></a></div>}
function ActionButton({icon:Icon,title,desc,onClick,busy,primary,danger}){return <button className={`action-button ${primary?"action-primary":""} ${danger?"action-danger":""}`} onClick={onClick} disabled={busy}><span className="action-icon"><Icon size={18}/></span><span><b>{title}</b><small>{desc}</small></span>{busy?<LoaderCircle className="spin"/>:<ArrowUpRight size={16}/>}</button>}

export default App;
