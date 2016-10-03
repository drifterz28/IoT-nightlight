
#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WebSocketsServer.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <Adafruit_NeoPixel.h>

const char* ssid = "SSID";
const char* pass = "password";
// enter Git hub page address here with out the https ex: drifterz28.github.io/IoT-nightlight/
String gitHubPage = "";

int pin = 0;
int ledCount = 10;

Adafruit_NeoPixel strip = Adafruit_NeoPixel(ledCount, pin, NEO_GRB + NEO_KHZ800);

#define USE_SERIAL Serial
ESP8266WiFiMulti WiFiMulti;

ESP8266WebServer server = ESP8266WebServer(80);
WebSocketsServer webSocket = WebSocketsServer(81);

int red = 000;
int green = 000;
int blue = 000;

// Fill the dots one after the other with a color
void colorWipe(uint32_t c, uint8_t wait) {
  for (uint16_t i = 0; i < strip.numPixels(); i++) {
    strip.setPixelColor(i, c);
    strip.show();
    delay(wait);
  }
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t lenght) {
  switch (type) {
    case WStype_DISCONNECTED:
      USE_SERIAL.printf("[%u] Disconnected!\n", num);
      break;
    case WStype_CONNECTED: {
        IPAddress ip = webSocket.remoteIP(num);
        USE_SERIAL.printf("[%u] Connected from %d.%d.%d.%d url: %s\n", num, ip[0], ip[1], ip[2], ip[3], payload);
        // send message to client
        webSocket.sendTXT(num, String(red) + "," + String(green) + "," + String(blue));
      }
      break;
    case WStype_TEXT:
      USE_SERIAL.printf("[%u] get Text: %s\n", num, payload);
      if (payload[0] == '#') {
        // we get RGB data
        // decode rgb data
        uint32_t rgb = (uint32_t) strtol((const char *) &payload[1], NULL, 16);
        red = ((rgb >> 16) & 0xFF);
        green = ((rgb >> 8) & 0xFF);
        blue = ((rgb >> 0) & 0xFF);
        colorWipe(strip.Color(red, green, blue), 0);
        webSocket.broadcastTXT(String(red) + "," + String(green) + "," + String(blue));
      }
      break;
  }
}

void setup() {
  USE_SERIAL.begin(115200);
  USE_SERIAL.println();

  for (uint8_t t = 4; t > 0; t--) {
    USE_SERIAL.printf("[SETUP] BOOT WAIT %d...\n", t);
    USE_SERIAL.flush();
    delay(1000);
  }
  WiFi.hostname("ESP_Light_1");
  WiFiMulti.addAP(ssid, pass);
  // softAP used to not boradcast SSID form esp
  WiFi.softAP("esp8266", "nothingyoucanfindout", 1, 1);
  while (WiFiMulti.run() != WL_CONNECTED) {
    delay(100);
  }
  USE_SERIAL.print("SSID: ");
  USE_SERIAL.println(ssid);

  USE_SERIAL.print("IP address: ");
  USE_SERIAL.println(WiFi.localIP()); // just so you know
  // start webSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);

  if (MDNS.begin("esp8266")) {
    USE_SERIAL.println("MDNS responder started");
  }

  // handle index
  server.on("/", []() {
    // send index.html
    String html = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>RGB Cololrs</title>";
    html += "<meta name=\"viewport\" content=\"user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width\">";
    html += "<link rel=\"stylesheet\" href=\"https://" + gitHubPage + "/assets/rgb-led.css\"/>";
    html += "<script src=\"https://unpkg.com/react@15.3.1/dist/react.js\"></script>";
    html += "<script src=\"https://unpkg.com/react-dom@15.3.1/dist/react-dom.js\"></script>";
    html += "<script src=\"https://unpkg.com/babel-core@5.8.38/browser.min.js\"></script>";
    html += "</head><body><div class=\"container\"></div>";
    html += "<script type=\"text/babel\" src=\"https://" + gitHubPage + "/assets/rgb-led.js\"></script></body></html>";
    server.send(200, "text/html", html);
  });

  server.begin();
  // start the LED's
  strip.begin();
  strip.show();
  // Add service to MDNS
  MDNS.addService("http", "tcp", 80);
  MDNS.addService("ws", "tcp", 81);
}

void loop() {
  webSocket.loop();
  server.handleClient();
}
