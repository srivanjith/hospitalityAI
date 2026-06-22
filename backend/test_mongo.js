const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const { connectDB, disconnectDB, db } = require('./config/db');

async function testCRUD() {
  console.log('🔗 Connecting to MongoDB...');
  await connectDB();

  if (db.isFallback()) {
    console.log('❌ Failed to connect to MongoDB. It is running in Fallback JSON mode.');
    process.exit(1);
  }

  console.log('✅ Connected successfully. Starting CRUD operations check...');
  const testCol = db.collection('test_users');

  // 1. Clean up old test data
  console.log('🧹 Cleaning up old test data...');
  await testCol.deleteMany({});

  // 2. Create / InsertOne
  console.log('🌱 Testing document creation...');
  const user = await testCol.create({
    name: 'Test Mongo User',
    email: 'testmongo@example.com',
    status: 'active',
    counter: 1
  });
  console.log('   Created doc:', user);

  if (!user.id || !user._id) {
    console.error('❌ Failed: document does not have id or _id');
    process.exit(1);
  }

  // 3. FindById
  console.log('🔍 Testing findById...');
  const foundById = await testCol.findById(user.id);
  console.log('   Found doc by ID:', foundById);
  if (!foundById || foundById.name !== 'Test Mongo User') {
    console.error('❌ Failed to find document by ID');
    process.exit(1);
  }

  // 4. FindOne
  console.log('🔍 Testing findOne...');
  const foundOne = await testCol.findOne({ email: 'testmongo@example.com' });
  console.log('   Found doc by query:', foundOne);
  if (!foundOne || foundOne.id !== user.id) {
    console.error('❌ Failed to find document by email query');
    process.exit(1);
  }

  // 5. UpdateOne
  console.log('📝 Testing updateOne...');
  const updateRes = await testCol.updateOne({ id: user.id }, { $set: { status: 'inactive' } });
  console.log('   Update result:', updateRes);
  const updatedDoc = await testCol.findById(user.id);
  console.log('   Updated doc status:', updatedDoc.status);
  if (updatedDoc.status !== 'inactive') {
    console.error('❌ Failed to update document using updateOne');
    process.exit(1);
  }

  // 6. FindByIdAndUpdate
  console.log('📝 Testing findByIdAndUpdate...');
  const updatedByPk = await testCol.findByIdAndUpdate(user.id, { $set: { name: 'Updated Name', counter: 10 } });
  console.log('   FindByIdAndUpdate returned doc:', updatedByPk);
  if (!updatedByPk || updatedByPk.name !== 'Updated Name' || updatedByPk.counter !== 10) {
    console.error('❌ Failed findByIdAndUpdate check');
    process.exit(1);
  }

  // 7. InsertMany
  console.log('🌱 Testing insertMany...');
  const insertedDocs = await testCol.insertMany([
    { name: 'Bulk User 1', email: 'bulk1@example.com' },
    { name: 'Bulk User 2', email: 'bulk2@example.com' }
  ]);
  console.log('   Inserted many docs:', insertedDocs);
  const count = await testCol.countDocuments();
  console.log('   Total documents count:', count);
  if (count !== 3) {
    console.error(`❌ Expected document count 3, got ${count}`);
    process.exit(1);
  }

  // 8. DeleteOne
  console.log('🗑️ Testing deleteOne...');
  const delRes = await testCol.deleteOne({ id: user.id });
  console.log('   Delete result:', delRes);
  const afterDelCount = await testCol.countDocuments();
  console.log('   Count after deleteOne:', afterDelCount);
  if (afterDelCount !== 2) {
    console.error(`❌ Expected count after delete 2, got ${afterDelCount}`);
    process.exit(1);
  }

  // 9. DeleteMany
  console.log('🗑️ Testing deleteMany...');
  const delManyRes = await testCol.deleteMany({});
  console.log('   Delete many result:', delManyRes);
  const finalCount = await testCol.countDocuments();
  console.log('   Final count:', finalCount);
  if (finalCount !== 0) {
    console.error(`❌ Expected final count 0, got ${finalCount}`);
    process.exit(1);
  }

  console.log('🎉 ALL CRUD OPERATIONS VERIFIED SUCCESSFULLY!');
  await disconnectDB();
  process.exit(0);
}

testCRUD().catch(async (err) => {
  console.error('❌ Test failed:', err);
  await disconnectDB();
  process.exit(1);
});
