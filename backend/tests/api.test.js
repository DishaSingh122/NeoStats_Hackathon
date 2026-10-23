import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../model/User.js';
import Project from '../model/Project.js';
import Task from '../model/Task.js';
import ProjectMember from '../model/ProjectMember.js';

describe('CollabFlow API Test Suite', () => {
  let adminToken;
  let pmToken;
  let memberToken;
  let viewerToken;
  let testProject;
  let testTask;

  before(async () => {
    // Connect to test database or local dev instance
    await connectDB();

    // Log in as each role to get authentication tokens
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@collabflow.dev', password: 'Password@123' });
    assert.strictEqual(adminRes.status, 200);
    adminToken = adminRes.body.token;

    const pmRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'pm@collabflow.dev', password: 'Password@123' });
    assert.strictEqual(pmRes.status, 200);
    pmToken = pmRes.body.token;

    const memberRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dev1@collabflow.dev', password: 'Password@123' });
    assert.strictEqual(memberRes.status, 200);
    memberToken = memberRes.body.token;

    const viewerRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@collabflow.dev', password: 'Password@123' });
    assert.strictEqual(viewerRes.status, 200);
    viewerToken = viewerRes.body.token;
  });

  after(async () => {
    await disconnectDB();
  });

  // 1. Health checks
  test('1. GET /api/health should return ok status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  });

  test('2. GET /api/ready should report database connection', async () => {
    const res = await request(app).get('/api/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ready');
    assert.strictEqual(res.body.database, 'connected');
  });

  // 3 & 4. Authentication tests
  test('3. POST /api/auth/login with valid credentials succeeds and returns user info', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@collabflow.dev', password: 'Password@123' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'admin');
    assert.strictEqual(res.body.user.passwordHash, undefined); // Password hash must never be returned!
  });

  test('4. POST /api/auth/login with invalid password is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@collabflow.dev', password: 'WrongPassword' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  // 5. Unauthorized access rejection
  test('5. Protected endpoints reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
  });

  // 6. Admin-only user management
  test('6. Admin can fetch users list; non-admin is forbidden', async () => {
    // Non-admin request
    const forbiddenRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${memberToken}`);
    assert.strictEqual(forbiddenRes.status, 403);

    // Admin request
    const adminRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(adminRes.status, 200);
    assert.ok(Array.isArray(adminRes.body.data));
    assert.ok(adminRes.body.pagination);
  });

  // 7. Project creation
  test('7. Project creation by PM succeeds and sets up manager membership', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        name: `Automated Test Project ${Date.now()}`,
        description: 'Test project created during test suite execution',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    testProject = res.body.data;
    assert.ok(testProject._id);

    // Add dev1 (member) and viewer to testProject
    const dev1User = await User.findOne({ email: 'dev1@collabflow.dev' });
    const viewerUser = await User.findOne({ email: 'viewer@collabflow.dev' });

    await request(app)
      .post(`/api/projects/${testProject._id}/team`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ userId: dev1User._id, role: 'member' });

    await request(app)
      .post(`/api/projects/${testProject._id}/team`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ userId: viewerUser._id, role: 'viewer' });
  });

  // 8. Project membership duplicate rejection
  test('8. Duplicate project membership is rejected', async () => {
    const dev1User = await User.findOne({ email: 'dev1@collabflow.dev' });
    const res = await request(app)
      .post(`/api/projects/${testProject._id}/team`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ userId: dev1User._id, role: 'member' });

    assert.strictEqual(res.status, 409);
  });

  // 9. Viewer read-only permissions
  test('9. Viewer cannot create tasks or modify project', async () => {
    const res = await request(app)
      .post(`/api/projects/${testProject._id}/tasks`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        title: 'Viewer unauthorized task',
        priority: 'low',
      });

    assert.strictEqual(res.status, 403);
  });

  // 10 & 11. Task creation and assignment
  test('10. PM can create and assign task to active project member', async () => {
    const dev1User = await User.findOne({ email: 'dev1@collabflow.dev' });
    const res = await request(app)
      .post(`/api/projects/${testProject._id}/tasks`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title: 'Initial Concurrency Target Task',
        description: 'Task designed to test OCC version incrementing and conflict protection',
        priority: 'high',
        assignedTo: dev1User._id,
        status: 'todo',
      });

    assert.strictEqual(res.status, 201);
    testTask = res.body.data;
    assert.strictEqual(testTask.version, 1);
  });

  // 12. Invalid task assignment rejection
  test('12. Rejects task assignment to user not in project', async () => {
    // Create standalone user not added to testProject
    const tempUser = await User.create({
      name: 'Outside User',
      email: `outside_${Date.now()}@collabflow.dev`,
      passwordHash: 'dummy',
      role: 'team_member',
      isActive: true,
    });

    const res = await request(app)
      .post(`/api/projects/${testProject._id}/tasks`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        title: 'Invalid Assignment Task',
        assignedTo: tempUser._id,
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /must be an active member of this project/i);
  });

  // 13. Comment access and creation
  test('13. Member can add comment to authorized task', async () => {
    const res = await request(app)
      .post(`/api/tasks/${testTask._id}/comments`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ content: 'Starting work on this task now.' });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.content, 'Starting work on this task now.');
  });

  // 14. Inactive user access rejection
  test('14. Inactive user is rejected on authenticated routes', async () => {
    const inactiveUser = await User.create({
      name: 'Deactivated User',
      email: `deactivated_${Date.now()}@collabflow.dev`,
      passwordHash: await User.hashPassword('Password@123'),
      role: 'team_member',
      isActive: false,
    });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: inactiveUser.email, password: 'Password@123' });

    assert.strictEqual(loginRes.status, 403);
    assert.match(loginRes.body.message, /deactivated/i);
  });

  // 15 & 16. CRITICAL REQUIREMENT: Optimistic Concurrency Control (OCC)
  test('15. Valid update increments task version from 1 to 2', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${testTask._id}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        status: 'in_progress',
        version: 1, // Correct current version
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.version, 2);
    assert.strictEqual(res.body.data.status, 'in_progress');
  });

  test('16. Stale task update returns HTTP 409 Conflict and protects data integrity', async () => {
    // Current task version in database is now 2.
    // User submits stale update with version 1.
    const conflictRes = await request(app)
      .patch(`/api/tasks/${testTask._id}`)
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        status: 'done',
        title: 'Conflicting Overwrite Attempt',
        version: 1, // Stale version!
      });

    assert.strictEqual(conflictRes.status, 409);
    assert.strictEqual(conflictRes.body.conflict, true);
    assert.strictEqual(conflictRes.body.expectedVersion, 1);
    assert.strictEqual(conflictRes.body.currentVersion, 2);
    assert.ok(conflictRes.body.latestTask);

    // Verify task was NOT modified in the database
    const verifyRes = await request(app)
      .get(`/api/tasks/${testTask._id}`)
      .set('Authorization', `Bearer ${pmToken}`);

    assert.strictEqual(verifyRes.body.data.version, 2);
    assert.strictEqual(verifyRes.body.data.status, 'in_progress');
    assert.notStrictEqual(verifyRes.body.data.title, 'Conflicting Overwrite Attempt');
  });
});
