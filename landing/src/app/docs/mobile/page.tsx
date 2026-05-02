export default function MobilePage() {
  return (
    <>
      <h1>Mobile Access</h1>
      <p className="subtitle">
        Monitor and control your agent swarm from any phone or tablet — on your
        local network or anywhere in the world.
      </p>

      <h2>How it works</h2>
      <p>
        Clustr&apos;s dashboard is a Progressive Web App (PWA) that runs in any
        mobile browser. Pairing is done via a one-time QR code that embeds a
        secure session token — no account or sign-in required.
      </p>

      <h2>Pairing your phone (local network)</h2>
      <ol>
        <li>
          Start Clustr as usual: <code>npx clustr-ai</code>
        </li>
        <li>
          Open the dashboard in your desktop browser and click the{" "}
          <strong>Connect Phone</strong> button (📱) in the header.
        </li>
        <li>
          A pairing modal appears with a QR code and a local network URL.
        </li>
        <li>
          Scan the QR code with your phone&apos;s camera. Your phone opens the
          dashboard automatically, already authenticated.
        </li>
      </ol>
      <p>
        Your phone and computer must be on the same Wi-Fi network for local
        pairing to work.
      </p>

      <h2>Adding to your home screen</h2>
      <p>
        The dashboard ships with a PWA manifest, so you can install it as a
        home-screen app for a native-feel experience:
      </p>
      <ul>
        <li>
          <strong>iOS (Safari):</strong> tap the Share button → &ldquo;Add to
          Home Screen&rdquo;
        </li>
        <li>
          <strong>Android (Chrome):</strong> tap the browser menu → &ldquo;Add
          to Home Screen&rdquo; or &ldquo;Install app&rdquo;
        </li>
      </ul>

      <h2>Remote access over cellular</h2>
      <p>
        To reach Clustr from outside your local network — on a cellular
        connection or a different Wi-Fi — start Clustr with the tunnel flag:
      </p>
      <pre>
        <code>CLUSTR_TUNNEL=1 npx clustr-ai</code>
      </pre>
      <p>
        This starts a Cloudflare tunnel and prints a public HTTPS URL in the
        terminal. The pairing QR code will automatically include this URL so
        scanning it works from any network.
      </p>

      <div className="callout">
        <p>
          <strong>Prerequisite:</strong> <code>cloudflared</code> must be
          installed on your machine before using <code>CLUSTR_TUNNEL=1</code>.
        </p>
        <ul>
          <li>
            macOS: <code>brew install cloudflared</code>
          </li>
          <li>
            Other platforms: see the{" "}
            <a
              href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloudflare downloads page
            </a>
          </li>
        </ul>
      </div>

      <h2>Security</h2>
      <p>
        All API routes and Socket.io connections require a session token when
        accessed remotely. The token is generated fresh each time Clustr starts
        and is embedded in the QR code URL. The pairing endpoint itself (which
        serves the QR code) is only accessible from <code>localhost</code>, so
        only someone with local access to the machine can generate a new token.
      </p>
    </>
  );
}
