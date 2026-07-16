let sdkPromise = null;

function waitForFb() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (window.FB) {
        clearInterval(timer);
        resolve(window.FB);
      } else if (Date.now() - started > 15000) {
        clearInterval(timer);
        reject(new Error("Facebook SDK load timeout"));
      }
    }, 50);
  });
}

export function loadFacebookSdk(appId) {
  if (!appId) {
    return Promise.reject(new Error("Facebook App ID not configured"));
  }
  if (window.FB) {
    return Promise.resolve(window.FB);
  }
  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: "v21.0",
      });
      resolve(window.FB);
    };

    if (document.getElementById("facebook-jssdk")) {
      waitForFb().then(resolve).catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export function requestFacebookAccessToken(appId) {
  return loadFacebookSdk(appId).then(
    (FB) =>
      new Promise((resolve, reject) => {
        FB.login(
          (response) => {
            const token = response?.authResponse?.accessToken;
            if (token) {
              resolve(token);
              return;
            }
            if (response?.status === "not_authorized") {
              reject(new Error("Facebook login was not authorized"));
              return;
            }
            reject(new Error("Facebook login was cancelled"));
          },
          { scope: "email,public_profile" },
        );
      }),
  );
}
