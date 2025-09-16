import * as Sentry from '@sentry/react';

// Enhanced button component to test Sentry's error tracking and tracing features
function SentryHelloWorldButtons() {
  const { logger } = Sentry;
  
  const handleErrorSimple = () => {
    Sentry.logger.info('User triggered test error', {
      action: 'test_error_button_click',
    });
    throw new Error('This is your first error!');
  }

  const handleErrorClick = () => {
    // Create a span to measure performance and track the error action
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Error Button Test Click",
      },
      (span) => {
        // Add context to the span
        span.setAttribute("test_type", "error_tracking");
        span.setAttribute("user_action", "intentional_error");
        
        // Log the action before throwing error
        logger.warn("User is about to trigger test error", {
          component: "ErrorButton",
          action: "error_test"
        });
        
        // Capture the error with additional context
        try {
          throw new Error('This is your first Sentry error test!');
        } catch (error) {
          // Capture the exception with additional context
          Sentry.captureException(error, {
            tags: {
              component: "ErrorButton",
              test_type: "error_tracking"
            },
            extra: {
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            }
          });
          
          // Re-throw to maintain normal error flow
          throw error;
        }
      }
    );
  };

  const handleSuccessClick = () => {
    Sentry.startSpan(
      {
        op: "ui.click", 
        name: "Success Button Test Click",
      },
      (span) => {
        span.setAttribute("test_type", "success_tracking");
        
        logger.info("User triggered success test", {
          component: "ErrorButton",
          action: "success_test"
        });
        
        alert("Success! This action was tracked in Sentry without errors.");
      }
    );
  };

  return (
    <div style={{ margin: '20px 0', textAlign: 'center' }}>

      <h3>🔍 Sentry Test Buttons</h3>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>

        <button
          onClick={handleErrorSimple}
        >
          Break the world
        </button>

        <button
          onClick={handleErrorClick}
          style={{
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🚨 Test Error Tracking
        </button>
        
        <button
          onClick={handleSuccessClick}
          style={{
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ✅ Test Success Tracking
        </button>

      </div>
      <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
        These buttons test Sentry's error tracking, logging, and performance monitoring
      </p>
    </div>
  );
}

export default SentryHelloWorldButtons;