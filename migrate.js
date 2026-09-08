const Database=require('better-sqlite3');
const path=require('path');
const db=new Database(process.env.DB_PATH||path.join(__dirname,'mkpos.db'));
db.pragma('journal_mode=WAL');

function tableExists(name){return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)}
function columnExists(table,column){return !!db.prepare(`PRAGMA table_info(${table})`).all().some(c=>c.name===column)}
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
console.log('MK POS database migration complete.');
db.close();
