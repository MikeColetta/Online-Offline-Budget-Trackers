let db;
let budgetVersion;

// Creates the "budget" database in indexedDB
const request = indexedDB.open('BudgetDB', budgetVersion || 1);

// This checks the versions to see if the IndexedDB needs an update. onupgradeneeded has a built in event listener (e).
request.onupgradeneeded = function (e) {
  console.log('Upgrade needed in IndexDB');

// Declaring the new and old versions of the databases
  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  db = e.target.result;
// If there is nothing else in the IndexedDB create the BudgetStore.
  if (db.objectStoreNames.length === 0) {
    db.createObjectStore('BudgetStore', { autoIncrement: true });
  }
};

// Built in IndexedDB function for if there is an error.
request.onerror = function (e) {
  console.log(`Woops! ${e.target.errorCode}`);
};

// This is called when the user is back online (see event listener on line 99)
function checkDatabase() {
  console.log('check db invoked');

  // Create a transaction variable that opens a transaction on your BudgetStore db
  let transaction = db.transaction(['BudgetStore'], 'readwrite');

  // Create a store variable that accesses your BudgetStore object
  const store = transaction.objectStore('BudgetStore');

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // .onsuccess is a indexedDB method that checks if the request was successful
  getAll.onsuccess = function () {
    // Once back online, add our store to the main (in this case Mongo) DB.
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // Checks that our returned response is not empty
          if (res.length !== 0) {
            // We then open a new transaction to BudgetStore with the ability to read and write
            // so we can clear the entries we just posted to the database.
            transaction = db.transaction(['BudgetStore'], 'readwrite');

            // Assign the current store to a variable
            const currentStore = transaction.objectStore('BudgetStore');

            // Clear existing entries because our bulk add to the DB was successful
            currentStore.clear();
            console.log('Clearing store 🧹');
          }
        });
    }
  };
}

request.onsuccess = function (e) {
  console.log('success');
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log('Backend online! 🗄️');
    checkDatabase();
  }
};

// SaveRecord used when offline. This is called in the sendTransaction function.
const saveRecord = (record) => {
  console.log('Save record invoked');
  // Create a transaction on the BudgetStore db with readwrite access
  const transaction = db.transaction(['BudgetStore'], 'readwrite');

  // Access your BudgetStore object store
  const store = transaction.objectStore('BudgetStore');

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);
