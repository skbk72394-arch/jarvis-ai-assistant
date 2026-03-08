/**
 * JARVIS Agents Screen
 * Swarm AI Dashboard with Matrix-style Terminal
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Agent Types
type AgentStatus = 'idle' | 'working' | 'error' | 'success';
type AgentType = 'coder' | 'netadmin' | 'researcher' | 'executor' | 'analyzer';

interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentTask: string;
  completedTasks: number;
  icon: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// Matrix-style Terminal Component
const DismissibleTerminal: React.FC<{
  logs: LogEntry[];
  onClear: () => void;
  visible: boolean;
}> = ({ logs, onClear, visible }) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return COLORS.status.online;
      case 'error': return COLORS.status.error;
      case 'warning': return COLORS.status.busy;
      default: return COLORS.neon.cyan;
    }
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.terminal, { opacity: opacityAnim }]}>
      <View style={styles.terminalHeader}>
        <View style={styles.terminalDots}>
          <View style={[styles.terminalDot, { backgroundColor: '#ff5f56' }]} />
          <View style={[styles.terminalDot, { backgroundColor: '#ffbd2e' }]} />
          <View style={[styles.terminalDot, { backgroundColor: '#27ca40' }]} />
        </View>
        <Text style={styles.terminalTitle}>◈ SWARM TERMINAL</Text>
        <TouchableOpacity onPress={onClear}>
          <Text style={styles.terminalClear}>CLEAR</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.terminalContent}
        contentContainerStyle={styles.terminalContentContainer}
      >
        {logs.length === 0 ? (
          <Text style={styles.terminalEmpty}>Waiting for agent activity...</Text>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.logLine}>
              <Text style={styles.logTimestamp}>{log.timestamp}</Text>
              <Text style={[styles.logAgent, { color: getLogColor(log.type) }]}>
                [{log.agent}]
              </Text>
              <Text style={styles.logMessage}>{log.message}</Text>
            </View>
          ))
        )}
        <Text style={styles.terminalCursor}>█</Text>
      </ScrollView>
    </Animated.View>
  );
};

// Agent Card Component
const AgentCard: React.FC<{
  agent: Agent;
  onPress: () => void;
}> = ({ agent, onPress }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (agent.status === 'working') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [agent.status]);

  const getStatusColor = () => {
    switch (agent.status) {
      case 'working': return COLORS.neon.blue;
      case 'success': return COLORS.status.online;
      case 'error': return COLORS.status.error;
      default: return COLORS.text.tertiary;
    }
  };

  return (
    <Animated.View style={[styles.agentCard, { transform: [{ scale: pulseAnim }] }]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={[COLORS.background.tertiary, COLORS.background.elevated]}
          style={styles.agentCardGradient}
        >
          <View style={styles.agentHeader}>
            <Text style={styles.agentIcon}>{agent.icon}</Text>
            <View style={[styles.agentStatusDot, { backgroundColor: getStatusColor() }]} />
          </View>

          <Text style={styles.agentName}>{agent.name}</Text>
          <Text style={styles.agentType}>{agent.type.toUpperCase()}</Text>

          {agent.status === 'working' && (
            <Text style={styles.agentTask} numberOfLines={1}>
              {agent.currentTask}
            </Text>
          )}

          <View style={styles.agentStats}>
            <Text style={styles.agentCompleted}>
              ✓ {agent.completedTasks} tasks
            </Text>
            <Text style={[styles.agentStatusText, { color: getStatusColor() }]}>
              {agent.status.toUpperCase()}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Agents Screen
export const AgentsScreen: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: '1',
      name: 'CoderAgent',
      type: 'coder',
      status: 'idle',
      currentTask: '',
      completedTasks: 47,
      icon: '👨‍💻',
    },
    {
      id: '2',
      name: 'NetAdminAgent',
      type: 'netadmin',
      status: 'idle',
      currentTask: '',
      completedTasks: 23,
      icon: '🌐',
    },
    {
      id: '3',
      name: 'ResearchAgent',
      type: 'researcher',
      status: 'idle',
      currentTask: '',
      completedTasks: 89,
      icon: '🔬',
    },
    {
      id: '4',
      name: 'ExecutorAgent',
      type: 'executor',
      status: 'idle',
      currentTask: '',
      completedTasks: 156,
      icon: '⚡',
    },
    {
      id: '5',
      name: 'AnalyzerAgent',
      type: 'analyzer',
      status: 'idle',
      currentTask: '',
      completedTasks: 34,
      icon: '📊',
    },
  ]);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [terminalVisible, setTerminalVisible] = useState(true);
  const [swarmActive, setSwarmActive] = useState(false);

  // Simulate agent activity
  useEffect(() => {
    if (!swarmActive) return;

    const interval = setInterval(() => {
      const randomAgent = agents[Math.floor(Math.random() * agents.length)];
      const actions = [
        'Processing request...',
        'Analyzing data patterns',
        'Executing task queue',
        'Fetching remote resources',
        'Running diagnostics',
        'Compiling results',
        'Syncing state',
      ];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];

      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        agent: randomAgent.name,
        message: randomAction,
        type: Math.random() > 0.8 ? 'success' : 'info',
      };

      setLogs(prev => [...prev.slice(-50), newLog]);
    }, 2000);

    return () => clearInterval(interval);
  }, [swarmActive, agents]);

  const toggleSwarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSwarmActive(!swarmActive);

    if (!swarmActive) {
      // Start swarm
      setAgents(prev => prev.map(a => ({ ...a, status: 'working' as AgentStatus })));
      setLogs(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          agent: 'SWARM',
          message: 'All agents activated and ready',
          type: 'success',
        },
      ]);
    } else {
      // Stop swarm
      setAgents(prev => prev.map(a => ({ ...a, status: 'idle' as AgentStatus })));
    }
  };

  const clearLogs = () => {
    setLogs([]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAgentPress = (agent: Agent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Could open agent detail modal
  };

  const totalTasks = agents.reduce((sum, a) => sum + a.completedTasks, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.background.primary, COLORS.background.secondary]}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>🤖 Swarm AI</Text>
        <Text style={styles.headerSubtitle}>
          {agents.filter(a => a.status === 'working').length} agents active • {totalTasks} tasks completed
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Swarm Control */}
        <View style={styles.section}>
          <View style={styles.swarmControl}>
            <TouchableOpacity
              style={[styles.swarmButton, swarmActive && styles.swarmButtonActive]}
              onPress={toggleSwarm}
            >
              <LinearGradient
                colors={swarmActive 
                  ? [COLORS.status.error, COLORS.status.busy]
                  : [COLORS.neon.blue, COLORS.neon.cyan]
                }
                style={styles.swarmButtonGradient}
              >
                <Text style={styles.swarmButtonText}>
                  {swarmActive ? '⏹ STOP SWARM' : '▶ START SWARM'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.terminalToggle}
              onPress={() => setTerminalVisible(!terminalVisible)}
            >
              <Text style={styles.terminalToggleText}>
                {terminalVisible ? '⬇ Hide Terminal' : '⬆ Show Terminal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Terminal */}
        <DismissibleTerminal
          logs={logs}
          onClear={clearLogs}
          visible={terminalVisible}
        />

        {/* Agents Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>◈ Active Agents</Text>
          <View style={styles.agentsGrid}>
            {agents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onPress={() => handleAgentPress(agent)}
              />
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>◈ System Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalTasks}</Text>
              <Text style={styles.statLabel}>Total Tasks</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{agents.length}</Text>
              <Text style={styles.statLabel}>Agents</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{logs.length}</Text>
              <Text style={styles.statLabel}>Log Entries</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {agents.filter(a => a.status === 'working').length}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neon.cyan,
    marginBottom: SPACING.md,
  },
  // Swarm Control
  swarmControl: {
    alignItems: 'center',
  },
  swarmButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    width: '100%',
  },
  swarmButtonActive: {
    shadowColor: COLORS.status.error,
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  swarmButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  swarmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.background.primary,
    letterSpacing: 1,
  },
  terminalToggle: {
    marginTop: SPACING.sm,
  },
  terminalToggleText: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  // Terminal
  terminal: {
    marginTop: SPACING.md,
    backgroundColor: '#0d1117',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    overflow: 'hidden',
  },
  terminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.light,
    backgroundColor: '#161b22',
  },
  terminalDots: {
    flexDirection: 'row',
    gap: 6,
  },
  terminalDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  terminalTitle: {
    fontSize: 12,
    color: COLORS.neon.cyan,
    fontWeight: '600',
    letterSpacing: 1,
  },
  terminalClear: {
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  terminalContent: {
    maxHeight: 200,
  },
  terminalContentContainer: {
    padding: SPACING.sm,
  },
  terminalEmpty: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontStyle: 'italic',
  },
  logLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  logTimestamp: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    fontFamily: 'monospace',
    marginRight: SPACING.xs,
  },
  logAgent: {
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginRight: SPACING.xs,
  },
  logMessage: {
    fontSize: 10,
    color: COLORS.text.primary,
    fontFamily: 'monospace',
    flex: 1,
  },
  terminalCursor: {
    fontSize: 12,
    color: COLORS.neon.cyan,
  },
  // Agents Grid
  agentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  agentCard: {
    width: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm) / 2,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  agentCardGradient: {
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border.light,
    borderRadius: BORDER_RADIUS.lg,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  agentIcon: {
    fontSize: 28,
  },
  agentStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
  },
  agentType: {
    fontSize: 10,
    color: COLORS.neon.blue,
    letterSpacing: 1,
  },
  agentTask: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  agentStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
  },
  agentCompleted: {
    fontSize: 10,
    color: COLORS.text.tertiary,
  },
  agentStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - SPACING.lg * 2 - SPACING.sm * 3) / 4,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.neon.blue,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.text.tertiary,
    marginTop: 2,
    textAlign: 'center',
  },
});

export default AgentsScreen;
