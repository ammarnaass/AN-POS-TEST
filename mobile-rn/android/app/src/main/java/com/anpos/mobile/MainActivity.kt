import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.os.Bundle

class MainActivity : ReactActivity() {
  override fun getReactActivityDelegate(): ReactActivityDelegate {
    return DefaultReactActivityDelegate(this, mainComponentName, DefaultNewArchitectureEntryPoint.getFabricEnabled())
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }
}
