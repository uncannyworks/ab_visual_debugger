var NET = require("net");
var PROTOBUF = require("protobufjs");

var Tools = function() {
  var self = this;

  this.OBJECT_TYPES = {
    Mech: 2,
    Projectile: 100   
  }

  /**
   * Message Codes.
   * @type {!Object.<string,number>}
   * @const
  */
  this.MESSAGE_CODES = {
    ServerStateMessage: 1,
    ServerWorldStateMessage: 2,
    ServerClientObjectSpawnMessage: 5,
    ServerClientObjectMoveMessage: 6,
    ServerClientObjectDestroyMessage: 7
  }

  /**
   * Response Codes.
   * @type {!Object.<string,number>}
   * @const
  */
  this.RESPONSE_CODES = {
    NONE: 0
  }

  /**
   * Error Codes.
   * @type {!Object.<string,number>}
   * @const
  */
  this.ERROR_CODES = {
    NONE: 0,
    WrongState: 50,
    ActuatorNotFound: 100,
    AmmoNotFound: 101,
    ArmNotFound: 102,
    ArmNoIndex: 103,
    ArmNotConfigured: 104,
    ArmorNotFound: 105,
    CapacitorNotFound: 106,
    ChassisNotFound: 107,
    ChassisNotConfigured: 108,
    CockpitNotFound: 109,
    CockpitNotConfigured: 110,
    CommunicationNotFound: 111,
    CommunicationsOverLimit: 112,
    ComputerNotFound: 113,
    ComputersOverLimit: 114,
    CounterMeasureNotFound: 115,
    CounterMeasureOverLimit: 116,
    EngineNotFound: 117,
    GyroNotFound: 118,
    LegNotFound: 119,
    LegNoIndex: 120,
    LegNotConfigured: 121,
    OverChassisMaxWeight: 122,
    ProtocolMismatch: 123,
    ReactorNotFound: 124,
    SensorNotFound: 125,
    SensorOverLimit: 126,
    TorsoNotFound: 127,
    TorsoNotConfigured: 128,
    WeaponNotFound: 129,
    WeaponOverLimit: 130
  }

  /**
   * Server World Codes.
   * @type {!Object.<string,number>}
   * @const
  */
  this.WORLD_STATE_CODES = {
    Initializing: 1,
    ConfigurationPhase: 2,
    StartupPhase: 3,
    GamePhase: 4,
    GameOverPhase: 5
  }

  /**
   * Component states.
   * @type {!Object.<string,number>}
   * @const
  */
  this.COMPONENT_STATE = {
    Active: 1,
    Inactive: 2,
    NoPower: 3,
    Disabled: 4,
    Destroyed: 5
  }

  /**
   * Component location types.
   * @type {!Object.<string,number>}
   * @const
  */
  this.LOCATION_TYPE = {
    None: 0,
    Arm: 1,
    Cockpit: 2,
    Leg: 3,
    Torso: 4,
    Weapon: 5    
  }

  /**
   * Weapon fire states.
   * @type {!Object.<string,number>}
   * @const
  */
  this.WEAPON_FIRE_STATE = {
    Idle: 1,
    Fire: 2,
    Reload: 3
  }

  /**
   * Action codes for SlugCommitMechRequest
   * @type {!Object.<string,number>}
   * @const
  */
  this.MECH_REQUEST_ACTION = {
    Shutdown: 1,
    PowerUp: 2,
    SelfDestruct: 3
  }

  var protobufBuilder = PROTOBUF.loadProtoFile(__dirname + "/messages.proto");
  var client = null;
  var currentWorldState = this.WORLD_STATE_CODES.Initializing;

  var _error_code_to_string = function(code) {
    for (var i in self.ERROR_CODES) {
      if (self.ERROR_CODES[i] == code) {
        return i;
      }
    }
  }

  var _message_code_to_string = function(code) {
    for (var i in self.MESSAGE_CODES) {
      if (self.MESSAGE_CODES[i] == code) {
        return i;
      }
    }
  }

  var _digest = function(byteArray) {
    try {
      switch (byteArray[0]) {
      case self.MESSAGE_CODES.ServerStateMessage:
        var Proto = protobufBuilder.build("ServerStateMessage");
        var message = Proto.decode(byteArray.slice(3));
        if (self.on_message_received) self.on_message_received(byteArray[0], message);
        break;

      case self.MESSAGE_CODES.ServerWorldStateMessage:
        var Proto = protobufBuilder.build("ServerWorldStateMessage");
        var message = Proto.decode(byteArray.slice(3));
        if (message.worldState == self.WORLD_STATE_CODES.ConfigurationPhase) {
          if (self.on_configuration_phase_start) self.on_configuration_phase_start();
        }
        if (message.worldState == self.WORLD_STATE_CODES.StartupPhase) {
          if (currentWorldState == self.WORLD_STATE_CODES.ConfigurationPhase) {
            if (self.on_configuration_phase_end) self.on_configuration_phase_end();
            if (self.on_startup_phase_start) self.on_startup_phase_start();
          }
        }
        if (message.worldState == self.WORLD_STATE_CODES.GamePhase) {
          if (currentWorldState == self.WORLD_STATE_CODES.StartupPhase) {
            if (self.on_startup_phase_end) self.on_startup_phase_end();
            if (self.on_game_phase_start) self.on_game_phase_start();
          }
        }
        if (message.worldState == self.WORLD_STATE_CODES.GameOverPhase) {
          if (currentWorldState == self.WORLD_STATE_CODES.GamePhase) {
            if (self.on_game_phase_end) self.on_game_phase_end();
          }
        }
        currentWorldState = message.worldState;
        if (self.on_message_received) self.on_message_received(byteArray[0], message);
        break;

      case self.MESSAGE_CODES.SlugActionLoginResponse:
        if (self.on_connection_start) self.on_connection_start();
        if (self.on_message_received) self.on_message_received(byteArray[0], {});
        break;

      case self.MESSAGE_CODES.ServerSlugGenericResponse:
        var Proto = protobufBuilder.build("ServerSlugGenericResponse");
        var message = Proto.decode(byteArray.slice(3));

        /* What we do with generic responses is determined by a combination of
         * the current world state and the request it is responding to.
         */
        switch (currentWorldState) {
        case self.WORLD_STATE_CODES.ConfigurationPhase:
          switch (message.msgId) {
          case self.MESSAGE_CODES.SlugConfigureDoneRequest:
            self.log("Configuration done message acknowledged.");
            break;

          case self.MESSAGE_CODES.SlugConfigureMechRequest:
            if (self.on_configuration_commit_finished) self.on_configuration_commit_finished(message.response, message.error, _error_code_to_string(message.error));
            break;
          }
        case self.WORLD_STATE_CODES.GamePhase:
          if (message.error != self.ERROR_CODES.NONE) {
            self.log("ERROR MID (" + message.msgId + ") -- " + _error_code_to_string(message.error));
          }
          break;
        }
        if (self.on_message_received) self.on_message_received(byteArray[0], message);
        break;      

      case self.MESSAGE_CODES.ServerClientObjectSpawnMessage:
        var Proto = protobufBuilder.build("ServerClientObjectSpawnMessage");
        var message = Proto.decode(byteArray.slice(3));
        if (self.on_spawn_message_received) self.on_spawn_message_received(message);
        if (self.on_message_received) self.on_message_received(byteArray[0], message);
        break;

      case self.MESSAGE_CODES.ServerClientObjectMoveMessage:
        var Proto = protobufBuilder.build("ServerClientObjectMoveMessage");
        var message = Proto.decode(byteArray.slice(3));
        if (self.on_move_message_received) self.on_move_message_received(message);
        if (self.on_message_received) self.on_message_received(byteArray[0], message);
        break;

      case self.MESSAGE_CODES.ServerClientObjectDestroyMessage:
        var Proto = protobufBuilder.build("ServerClientObjectDestroyMessage");
        var message = Proto.decode(byteArray.slice(3));
        if (self.on_destroy_message_received) self.on_destroy_message_received(message);
        if (self.on_message_received) self.on_message_received(byteArray[0], message);
        break;

      default:
        self.log("(WARN) Unrecognized Message: " + byteArray[0]);
        if (self.on_message_received) self.on_message_received(byteArray[0], {});
      }
    } catch ( err ) {
      console.log(err)
    }
  }

  /**
   * Triggers when the client receives ANY message.
   * Override with desired behavior.
   * @param {number} code - the message code.
   * @param {object} message - the message JSON.
   */
  this.on_message_received = function(code, message) {}

  /**
   * Triggers on authenticated connection.
   * Override with desired behavior.
   */
  this.on_connection_start = function() {};
  /**
   * Triggers on TCP connection close.
   * Override with desired behavior.
   */
  this.on_connection_closed = function() {};
  /**
   * Triggers on TCP connection timeout.
   * Override with desired behavior.
   */
  this.on_connection_timeout = function() {};
  /**
   * Triggers on TCP connection end.
   * Override with desired behavior.
   */
  this.on_connection_end = function() {};
  /**
   * Triggers on TCP connection error.
   * Override with desired behavior.
   * @param {Object} error - a 'net' module Error object.
   */
  this.on_connection_error = function(error) {};
  /**
   * Triggers on Configuration Phase Start
   * Override with desired behavior.
   */
  this.on_configuration_phase_start = function() {};
  /**
   * Triggers on Configuration Phase End
   * Override with desired behavior.
   */
  this.on_configuration_phase_end = function() {};
  /**
   * Triggers on Startup Phase Start
   * Override with desired behavior.
   */
  this.on_startup_phase_start = function() {};
  /**
   * Triggers on Startup Phase End
   * Override with desired behavior.
   */
  this.on_startup_phase_end = function() {};
  /**
   * Triggers on Game Phase Start
   * Override with desired behavior.
   */
  this.on_game_phase_start = function() {};
  /**
   * Triggers on Game Phase End
   * Override with desired behavior.
   */
  this.on_game_phase_end = function() {};

  this.on_spawn_message_received = function() {};
  this.on_move_message_received = function() {};
  this.on_destroy_message_received = function() {};

  /**
  * Triggers on Configuration Commit Finished.
  * Override with desired behavior.
  * @param {object[]} errorsArray
  * @param {number} errorsArray[].response_code
  * @param {number} errorsArray[].error_code
  * @param {string} errorsArray[].error_string
  **/
  this.on_configuration_commit_finished = function(errorsArray) {};

  /**
   * Creates TCP Connection   
   * @param {string} port - Connection port.
   * @param {string} ip - Connection IP Address.
   */
  this.connect = function(port, ip) {
    var sdk = this;

    client = new NET.Socket();
    client.buffer = new Buffer([]);

    client.connect(port, ip, function() {
      client.setNoDelay(true);
    });

    client.on('data', function(data) {
      if (client.messageBuffer && client.messageBuffer.length > 0) {
        var t = new Buffer(data.length + client.messageBuffer.length);
        client.messageBuffer.copy(t, 0, 0, client.messageBuffer.length);
        data.copy(t, client.messageBuffer.length, 0, data.length);
        client.messageBuffer = t;
      } else {
        client.messageBuffer = data;
      }

      while (true) {
        // Is the messageBuffer too small to be any message?
        if (client.messageBuffer.length < 3) {
          console.log("DEBUG: MessageBuffer too small. Waiting for next data event.");
          return;
        }

        var len = client.messageBuffer.readUInt16BE(1);

        // Is the messageBuffer too small to contain the full body of the message?
        if (client.messageBuffer.length < 3 + len) {
          console.log("DEBUG: MessageBuffer contains incomplete message body. Waiting for next data event.");
          return;
        }

        var chunk = client.messageBuffer.slice(0, 3 + len);
        _digest(chunk);

        // Find next message position.
        var nextMessageStart = 3 + len;

        // Are we at the end of the buffer?
        if (nextMessageStart == client.messageBuffer.length) {
          client.messageBuffer = null;
          return;
        }

        // Step the Buffer
        var t = new Buffer(client.messageBuffer.length - nextMessageStart);
        client.messageBuffer.copy(t, 0, nextMessageStart, client.messageBuffer.length);
        client.messageBuffer = t;
      }
    });

    client.on('connect', function() { });

    client.on('close', function() {
      if (self.on_connection_closed) self.on_connection_closed();
    });

    client.on('end', function() {
      if (self.on_connection_end) self.on_connection_end();
    });

    client.on('error', function(err) {
      if (self.on_connection_error) self.on_connection_error(err);
    });

    client.on('timeout', function() {
      if (self.on_connection_timeout) self.on_connection_timeout();
    });
  }

  /**
   * Kills the TCP Connection.
  **/
  this.kill_connection = function() {
    client.destroy();
    client = null;
  }

  /**
   * Logs a message.
  **/
  this.log = function(message) {
    if (enableLogging)
      console.log("SDK: " + message);
  }

  /**
   * Show SDK log messages in console.
  **/
  this.enable_logging = function() {
    enableLogging = true;
  }

  /**
   * Hide SDK log messages in console.
  **/
  this.disable_logging = function() {
    enableLogging = false;
  }
};

module.exports = new Tools();
