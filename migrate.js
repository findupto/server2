const Database=require('better-sqlite3');
const path=require('path');
const db=new Database(process.env.DB_PATH||path.join(__dirname,'mkpos.db'));
db.pragma('journal_mode=WAL');

function tableExists(name){return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)}
function columnExists(table,column){return tableExists(table)&&db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===column)}
function addColumn(table,column,definition){if(tableExists(table)&&!columnExists(table,column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)}

if(tableExists('customers')){
  addColumn('customers','username','TEXT');
  addColumn('customers','password_hash','TEXT DEFAULT \'\'');
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_username ON customers(username) WHERE username IS NOT NULL AND username <> ''");
}
if(tableExists('products'))addColumn('products','description','TEXT DEFAULT \'\'');
if(tableExists('orders')){
  addColumn('orders','payment_method','TEXT DEFAULT \'\'');
  addColumn('orders','stock_consumed','INTEGER DEFAULT 0');
}

// Enterprise intelligence migrations: older databases may already contain these
// tables with an earlier schema. Ensure every column used by the current routes exists.
if(tableExists('reservations')){
  addColumn('reservations','customer_id','TEXT');
  addColumn('reservations','customer_name','TEXT');
  addColumn('reservations','phone','TEXT');
  addColumn('reservations','table_no','TEXT');
  addColumn('reservations','party_size','INTEGER DEFAULT 2');
  addColumn('reservations','start_at','TEXT');
  addColumn('reservations','end_at','TEXT');
  addColumn('reservations','status','TEXT DEFAULT \'booked\'');
  addColumn('reservations','notes','TEXT DEFAULT \'\'');
  addColumn('reservations','created_at','TEXT');
  addColumn('reservations','user_id','TEXT');
  db.exec("CREATE INDEX IF NOT EXISTS idx_reservations_start ON reservations(start_at,status)");
}
if(tableExists('product_modifiers')){
  addColumn('product_modifiers','product_id','TEXT');
  addColumn('product_modifiers','name','TEXT');
  addColumn('product_modifiers','price_delta','REAL DEFAULT 0');
  addColumn('product_modifiers','active','INTEGER DEFAULT 1');
}
if(tableExists('delivery_zones')){
  addColumn('delivery_zones','name','TEXT');
  addColumn('delivery_zones','fee','REAL DEFAULT 0');
  addColumn('delivery_zones','min_order','REAL DEFAULT 0');
  addColumn('delivery_zones','active','INTEGER DEFAULT 1');
}
if(tableExists('branches')){
  addColumn('branches','name','TEXT');
  addColumn('branches','address','TEXT DEFAULT \'\'');
  addColumn('branches','phone','TEXT DEFAULT \'\'');
  addColumn('branches','active','INTEGER DEFAULT 1');
  addColumn('branches','created_at','TEXT');
}
if(tableExists('branch_devices')){
  addColumn('branch_devices','branch_id','TEXT');
  addColumn('branch_devices','name','TEXT');
  addColumn('branch_devices','type','TEXT');
  addColumn('branch_devices','active','INTEGER DEFAULT 1');
  addColumn('branch_devices','last_seen_at','TEXT');
}

console.log('MK POS database migration complete.');
db.close();
