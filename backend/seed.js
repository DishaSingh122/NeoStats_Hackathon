import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import User from './model/User.js';
import Project from './model/Project.js';
import ProjectMember from './model/ProjectMember.js';
import Task from './model/Task.js';
import Comment from './model/Comment.js';

export const seedDatabase = async () => {
  console.log('[Seed] Starting database seed process...');

  try {
    // Connect to database
    await connectDB();

    // 1. Seed Users (Upsert pattern to be idempotent)
    console.log('[Seed] Seeding users with hashed credentials...');

    const demoUsers = [
      {
        name: 'Sarah Connor (Admin)',
        email: 'admin@collabflow.dev',
        password: 'Password@123',
        role: 'admin',
      },
      {
        name: 'Alex Rivera (Project Manager)',
        email: 'pm@collabflow.dev',
        password: 'Password@123',
        role: 'project_manager',
      },
      {
        name: 'David Chen (Senior Engineer)',
        email: 'dev1@collabflow.dev',
        password: 'Password@123',
        role: 'team_member',
      },
      {
        name: 'Maya Patel (UI/UX Developer)',
        email: 'dev2@collabflow.dev',
        password: 'Password@123',
        role: 'team_member',
      },
      {
        name: 'James Wilson (Auditor / Viewer)',
        email: 'viewer@collabflow.dev',
        password: 'Password@123',
        role: 'viewer',
      },
    ];

    const userMap = {};

    for (const userData of demoUsers) {
      let user = await User.findOne({ email: userData.email });
      if (!user) {
        const passwordHash = await User.hashPassword(userData.password);
        user = await User.create({
          name: userData.name,
          email: userData.email,
          passwordHash,
          role: userData.role,
          isActive: true,
        });
        console.log(`[Seed] Created user: ${user.name} (${user.role})`);
      } else {
        console.log(`[Seed] User already exists: ${user.name} (${user.role})`);
      }
      userMap[userData.email] = user;
    }

    const admin = userMap['admin@collabflow.dev'];
    const pm = userMap['pm@collabflow.dev'];
    const dev1 = userMap['dev1@collabflow.dev'];
    const dev2 = userMap['dev2@collabflow.dev'];
    const viewer = userMap['viewer@collabflow.dev'];

    // 2. Seed Projects
    console.log('[Seed] Seeding projects...');
    const demoProjects = [
      {
        name: 'NextGen Cloud Migration',
        description: 'Transitioning legacy on-prem infrastructure to multi-region cloud services with zero downtime.',
        manager: pm._id,
        createdBy: admin._id,
        status: 'active',
      },
      {
        name: 'Mobile App 3.0 Redesign',
        description: 'Revamping the user onboarding flow, checkout ergonomics, and offline synchronization.',
        manager: pm._id,
        createdBy: pm._id,
        status: 'active',
      },
      {
        name: 'Q3 Security & Compliance Audit',
        description: 'SOC2 Type II verification, penetration testing remediations, and role-based access audits.',
        manager: admin._id,
        createdBy: admin._id,
        status: 'active',
      },
      {
        name: 'Legacy V1 Sunset',
        description: 'Archived project from deprecating legacy REST v1 gateways and deprecated services.',
        manager: pm._id,
        createdBy: admin._id,
        status: 'archived',
      },
    ];

    const projectMap = {};

    for (const projData of demoProjects) {
      let project = await Project.findOne({ name: projData.name });
      if (!project) {
        project = await Project.create(projData);
        console.log(`[Seed] Created project: ${project.name}`);
      } else {
        console.log(`[Seed] Project already exists: ${project.name}`);
      }
      projectMap[projData.name] = project;
    }

    // 3. Seed Project Memberships
    console.log('[Seed] Seeding project memberships...');
    const p1 = projectMap['NextGen Cloud Migration'];
    const p2 = projectMap['Mobile App 3.0 Redesign'];
    const p3 = projectMap['Q3 Security & Compliance Audit'];

    const memberships = [
      // Project 1 members
      { project: p1._id, user: admin._id, role: 'manager' },
      { project: p1._id, user: pm._id, role: 'manager' },
      { project: p1._id, user: dev1._id, role: 'member' },
      { project: p1._id, user: dev2._id, role: 'member' },
      { project: p1._id, user: viewer._id, role: 'viewer' },

      // Project 2 members
      { project: p2._id, user: pm._id, role: 'manager' },
      { project: p2._id, user: dev1._id, role: 'member' },
      { project: p2._id, user: dev2._id, role: 'member' },
      { project: p2._id, user: viewer._id, role: 'viewer' },

      // Project 3 members
      { project: p3._id, user: admin._id, role: 'manager' },
      { project: p3._id, user: pm._id, role: 'member' },
      { project: p3._id, user: viewer._id, role: 'viewer' },
    ];

    for (const m of memberships) {
      await ProjectMember.findOneAndUpdate(
        { project: m.project, user: m.user },
        { role: m.role },
        { upsert: true, new: true }
      );
    }
    console.log('[Seed] Project memberships ensured.');

    // 4. Seed Tasks with Concurrency Version = 1
    console.log('[Seed] Seeding tasks...');
    const demoTasks = [
      {
        title: 'Configure VPC Peering and Security Groups',
        description: 'Set up cross-account VPC peering with strictly defined security group egress and ingress rules.',
        project: p1._id,
        assignedTo: dev1._id,
        status: 'done',
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdBy: pm._id,
        version: 1,
      },
      {
        title: 'Implement Database Replication & Failover',
        description: 'Configure automated read replicas and test high availability failover scenarios.',
        project: p1._id,
        assignedTo: dev1._id,
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdBy: pm._id,
        version: 1,
      },
      {
        title: 'Benchmark Load Balancer Latency',
        description: 'Run distributed artillery stress tests to verify p99 latency stays under 45ms.',
        project: p1._id,
        assignedTo: dev2._id,
        status: 'todo',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: pm._id,
        version: 1,
      },
      {
        title: 'Design Mobile Dark Mode Palettes',
        description: 'Create WCAG AA compliant color tokens for high-contrast OLED screens.',
        project: p2._id,
        assignedTo: dev2._id,
        status: 'in_progress',
        priority: 'medium',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdBy: pm._id,
        version: 1,
      },
      {
        title: 'Optimize Gesture Navigation Transitions',
        description: 'Ensure 120Hz smooth fluid animation transitions during sheet drag gestures.',
        project: p2._id,
        assignedTo: dev2._id,
        status: 'todo',
        priority: 'low',
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        createdBy: pm._id,
        version: 1,
      },
      {
        title: 'Audit IAM Role Policies',
        description: 'Remove wildcard permissions and enforce least-privilege principle across all service accounts.',
        project: p3._id,
        assignedTo: admin._id,
        status: 'done',
        priority: 'high',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
        version: 1,
      },
    ];

    const createdTasks = [];
    for (const t of demoTasks) {
      let task = await Task.findOne({ project: t.project, title: t.title });
      if (!task) {
        task = await Task.create(t);
        console.log(`[Seed] Created task: ${task.title}`);
      } else {
        console.log(`[Seed] Task already exists: ${task.title}`);
      }
      createdTasks.push(task);
    }

    // 5. Seed Comments
    console.log('[Seed] Seeding comments...');
    if (createdTasks.length > 0) {
      const taskWithComments = createdTasks[1]; // 'Implement Database Replication & Failover'
      const existingComments = await Comment.find({ task: taskWithComments._id });

      if (existingComments.length === 0) {
        await Comment.create([
          {
            task: taskWithComments._id,
            author: pm._id,
            content: 'Please ensure we run the failover drill during low traffic hours.',
          },
          {
            task: taskWithComments._id,
            author: dev1._id,
            content: 'Understood. Automated replication is synchronized. Running drill at 18:00 UTC.',
          },
        ]);
        console.log('[Seed] Sample task comments created.');
      }
    }

    console.log('====================================================');
    console.log('  Database Seeding Completed Successfully!');
    console.log('  Demo Credentials:');
    console.log('    Admin:          admin@collabflow.dev  / Password@123');
    console.log('    Project Manager: pm@collabflow.dev    / Password@123');
    console.log('    Team Member 1:  dev1@collabflow.dev   / Password@123');
    console.log('    Team Member 2:  dev2@collabflow.dev   / Password@123');
    console.log('    Viewer:         viewer@collabflow.dev / Password@123');
    console.log('====================================================');
  } catch (error) {
    console.error('[Seed] Seeding failed:', error);
    throw error;
  }
};

// If run directly from terminal
if (process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async () => {
      await disconnectDB();
      process.exit(1);
    });
}
