// Standalone AI policy.
// The POS AI runs from built-in deterministic rules and browser speech APIs.
// No cloud API key and no local model are required.
delete process.env.OPENAI_COMMAND_MODEL;
delete process.env.OPENAI_VISION_MODEL;
delete process.env.OPENAI_REALTIME_MODEL;
process.env.MK_STANDALONE_AI='1';
