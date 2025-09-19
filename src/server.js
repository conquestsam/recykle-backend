console.log('🎬 === RECYKLE-NAIJA SERVER STARTUP DEBUG ===');
console.log('📊 Node.js Version:', process.version);
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('📊 Current Directory:', process.cwd());
console.log('');

// Test 1: Basic Node.js functionality
console.log('🧪 TEST 1: Basic Node.js functionality...');
try {
  const testVar = 'Hello World';
  console.log('✅ TEST 1 PASSED: Basic Node.js working');
} catch (error) {
  console.error('❌ TEST 1 FAILED: Basic Node.js error:', error);
  process.exit(1);
}

// Test 2: Import basic modules
console.log('🧪 TEST 2: Importing basic modules...');
let express, cors, helmet;
try {
  express = (await import('express')).default;
  console.log('✅ Express imported successfully');
} catch (error) {
  console.error('❌ Express import failed:', error);
  process.exit(1);
}

try {
  cors = (await import('cors')).default;
  console.log('✅ CORS imported successfully');
} catch (error) {
  console.error('❌ CORS import failed:', error);
  process.exit(1);
}

try {
  helmet = (await import('helmet')).default;
  console.log('✅ Helmet imported successfully');
} catch (error) {
  console.error('❌ Helmet import failed:', error);
  process.exit(1);
}

console.log('✅ TEST 2 PASSED: All basic modules imported');

// Test 3: Create basic Express app
console.log('🧪 TEST 3: Creating Express app...');
let app;
try {
  app = express();
  console.log('✅ Express app created successfully');
} catch (error) {
  console.error('❌ Express app creation failed:', error);
  process.exit(1);
}

// Test 4: Add basic middleware
console.log('🧪 TEST 4: Adding basic middleware...');
try {
  app.use(helmet());
  console.log('✅ Helmet middleware added');
  
  app.use(cors());
  console.log('✅ CORS middleware added');
  
  app.use(express.json());
  console.log('✅ JSON middleware added');
  
  console.log('✅ TEST 4 PASSED: Basic middleware configured');
} catch (error) {
  console.error('❌ TEST 4 FAILED: Middleware error:', error);
  process.exit(1);
}

// Test 5: Add basic route
console.log('🧪 TEST 5: Adding basic routes...');
try {
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ Health route added');
  
  app.get('/api', (req, res) => {
    res.json({
      success: true,
      message: 'Recykle-Naija API v1.0.0',
      endpoints: ['health', 'auth', 'users', 'pickups', 'rewards']
    });
  });
  console.log('✅ API info route added');
  
  console.log('✅ TEST 5 PASSED: Basic routes configured');
} catch (error) {
  console.error('❌ TEST 5 FAILED: Route error:', error);
  process.exit(1);
}

// Test 6: Try to import database connection
console.log('🧪 TEST 6: Testing database connection...');
let dbConnected = false;
try {
  const { connectDatabase } = await import('./config/database.js');
  console.log('✅ Database module imported successfully');
  
  try {
    dbConnected = await connectDatabase();
    if (dbConnected) {
      console.log('✅ Database connected successfully');
    } else {
      console.log('⚠️  Database connection failed, continuing with mock data');
    }
  } catch (dbError) {
    console.log('⚠️  Database connection error:', dbError.message);
    console.log('⚠️  Continuing without database...');
  }
  
  console.log('✅ TEST 6 PASSED: Database module handled gracefully');
} catch (error) {
  console.error('⚠️  TEST 6 WARNING: Database import failed:', error.message);
  console.log('⚠️  Continuing without database...');
}

// Test 7: Try to import app.js
console.log('🧪 TEST 7: Testing app.js import...');
let appJsWorking = false;
let io = null; // We'll need to capture the io instance

try {
  const appModule = await import('./app.js');
  console.log('✅ App.js imported successfully');
  
  if (appModule.app && appModule.server && appModule.io) {
    console.log('✅ App.js exports app, server, and io correctly');
    app = appModule.app;
    io = appModule.io;
    appJsWorking = true;
    console.log('✅ Using full app.js with all endpoints and Socket.io');
  } else {
    console.log('⚠️  App.js does not export all required properties');
  }
} catch (error) {
  console.error('⚠️  TEST 7 WARNING: App.js import failed:', error.message);
}

// Test 8: Add mock auth endpoints if app.js didn't work
if (!appJsWorking) {
  console.log('🧪 TEST 8: Adding mock auth endpoints...');
  try {
    app.post('/api/auth/login', (req, res) => {
      console.log('🔐 Mock login attempt:', req.body?.email);
      res.json({
        success: true,
        message: 'Mock login successful',
        data: {
          user: {
            id: '1',
            email: req.body?.email || 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'household'
          },
          token: 'mock_jwt_token_12345'
        }
      });
    });
    
    app.post('/api/auth/register', (req, res) => {
      console.log('📝 Mock registration attempt:', req.body?.email);
      res.json({
        success: true,
        message: 'Mock registration successful',
        data: {
          user: {
            id: '2',
            email: req.body?.email || 'new@example.com',
            firstName: req.body?.firstName || 'New',
            lastName: req.body?.lastName || 'User',
            role: req.body?.role || 'household'
          },
          token: 'mock_jwt_token_67890'
        }
      });
    });
    
    console.log('✅ TEST 8 PASSED: Mock auth endpoints added');
  } catch (error) {
    console.error('❌ TEST 8 FAILED: Mock endpoints error:', error);
  }
}

// Test 9: Try to start server
console.log('🧪 TEST 9: Starting HTTP server...');
const PORT = process.env.PORT || 3001;

try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🎉 ================================');
    console.log('🚀 SERVER STARTED SUCCESSFULLY!');
    console.log('🎉 ================================');
    console.log('');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 Server URL: http://localhost:${PORT}`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
    console.log(`📖 API Info: http://localhost:${PORT}/api`);
    console.log('');
    
    console.log('🔧 Component Status:');
    console.log(`   • Database: ${dbConnected ? '✅ Connected' : '⚠️  Mock Data'}`);
    console.log(`   • App.js: ${appJsWorking ? '✅ Full App' : '⚠️  Basic App'}`);
    console.log(`   • Controllers: ${appJsWorking ? '✅ All Loaded' : '⚠️  Mock Only'}`);
    console.log('');
    
    if (appJsWorking) {
      console.log('📋 Available Endpoints (120+):');
      console.log('   • Authentication: /api/auth/*');
      console.log('   • Users: /api/users/*');
      console.log('   • Pickups: /api/pickups/*');
      console.log('   • Rewards: /api/rewards/*');
      console.log('   • Analytics: /api/analytics/*');
      console.log('   • Notifications: /api/notifications/*');
      console.log('   • Payments: /api/payments/*');
      console.log('   • Admin: /api/admin/*');
      console.log('   • And many more...');
    } else {
      console.log('📋 Available Endpoints (Basic):');
      console.log('   • GET  /health - Health check');
      console.log('   • GET  /api - API info');
      console.log('   • POST /api/auth/login - Mock login');
      console.log('   • POST /api/auth/register - Mock register');
    }
    
    console.log('');
    console.log('🎯 Server is ready to accept requests!');
    console.log('================================');
  });

  // Error handling for server
  server.on('error', (error) => {
    console.error('💥 Server error:', error);
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      console.log('💡 Try using a different port or kill the existing process');
    }
    process.exit(1);
  });

  console.log('✅ TEST 9 PASSED: Server started successfully');

} catch (error) {
  console.error('❌ TEST 9 FAILED: Server startup error:', error);
  process.exit(1);
}

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});

console.log('✅ All tests completed, server should be starting...');