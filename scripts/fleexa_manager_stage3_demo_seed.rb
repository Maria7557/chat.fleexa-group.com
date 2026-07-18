# frozen_string_literal: true

# Local-only Stage 3 review data for Fleexa Manager.
#
# Run from the patched Chatwoot Rails app with:
#   bundle exec rails runner /tmp/fleexa_manager_stage3_demo_seed.rb
#
# The script is intentionally non-destructive for user data. It only removes and
# recreates records carrying MARKER in custom_attributes.

require 'json'
require 'set'

MARKER = 'fleexa_manager_stage3_demo'
MARKETING_CONFIG_KEY = 'crm_marketing_dashboard'

TRAFFIC_SOURCES = [
  { key: 'google_ads', label: 'Google Ads' },
  { key: 'meta_ads', label: 'Meta Ads' },
  { key: 'dubizzle', label: 'Dubizzle' },
  { key: 'telegram_ads', label: 'Telegram Ads' },
  { key: 'website_organic', label: 'Website Organic' },
  { key: 'referral', label: 'Referral' },
  { key: 'blogger_ugc', label: 'Blogger UGC' }
].freeze

LEAD_ORIGINS = [
  { key: 'website', label: 'Website' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'call', label: 'Call' },
  { key: 'telegram_bot', label: 'Telegram Bot' },
  { key: 'facebook', label: 'Facebook' }
].freeze

STAGES = [
  { slug: 'unassigned', name: 'Unassigned', color: '#6B7280', position: 1, fleet_status_trigger: nil },
  { slug: 'in_progress', name: 'In Progress', color: '#8B5CF6', position: 2, fleet_status_trigger: nil },
  { slug: 'reserved', name: 'Reserved', color: '#3B82F6', position: 3, fleet_status_trigger: 'reserved' },
  { slug: 'rental', name: 'Rental', color: '#14B8A6', position: 4, fleet_status_trigger: 'rental' },
  { slug: 'closed_won', name: 'Done', color: '#22C55E', position: 999, fleet_status_trigger: 'done' },
  { slug: 'closed_lost', name: 'Lost', color: '#DC2626', position: 1000, fleet_status_trigger: 'cancel' }
].freeze

LOSS_REASONS = [
  'No reply after quote',
  'Budget mismatch',
  'No valid license',
  'Vehicle unavailable'
].freeze

DEMO_ROWS = [
  {
    key: 'aisha-google-waiting',
    days_ago: 6,
    name: 'Aisha Morgan',
    phone: '+971500000301',
    email: 'stage3.aisha@fleexa.local',
    source_key: 'google_ads',
    origin_key: 'website',
    stage_slug: 'in_progress',
    qualification_status: 'qualified',
    amount: 3200,
    car: 'Range Rover Vogue',
    assigned: true,
    unread: true,
    reply_state: 'waiting_for_reply',
    customer_text: 'Need a Range Rover for a weekend, I came from Google.'
  },
  {
    key: 'omar-meta-reserved',
    days_ago: 5,
    name: 'Omar Sterling',
    phone: '+971500000302',
    email: 'stage3.omar@fleexa.local',
    source_key: 'meta_ads',
    origin_key: 'instagram',
    stage_slug: 'reserved',
    qualification_status: 'qualified',
    amount: 2500,
    car: 'BMW 430i',
    assigned: true,
    unread: false,
    reply_state: 'replied',
    customer_text: 'Instagram ad said the 430i is available tomorrow.'
  },
  {
    key: 'maya-dubizzle-unassigned',
    days_ago: 4,
    name: 'Maya Laurent',
    phone: '+971500000303',
    email: 'stage3.maya@fleexa.local',
    source_key: 'dubizzle',
    origin_key: 'call',
    stage_slug: 'unassigned',
    qualification_status: 'pending',
    amount: 1200,
    car: 'BMW X7',
    assigned: false,
    unread: true,
    reply_state: 'waiting_for_reply',
    customer_text: 'Calling from Dubizzle, can someone confirm X7 availability?'
  },
  {
    key: 'leo-organic-rental',
    days_ago: 3,
    name: 'Leo Haddad',
    phone: '+971500000304',
    email: 'stage3.leo@fleexa.local',
    source_key: 'website_organic',
    origin_key: 'website',
    stage_slug: 'rental',
    qualification_status: 'qualified',
    amount: 5400,
    car: 'Porsche 911',
    assigned: true,
    unread: false,
    reply_state: 'replied',
    customer_text: 'I found you on the website and want the Porsche.'
  },
  {
    key: 'nadia-referral-done',
    days_ago: 2,
    name: 'Nadia Costa',
    phone: '+971500000305',
    email: 'stage3.nadia@fleexa.local',
    source_key: 'referral',
    origin_key: 'whatsapp',
    stage_slug: 'closed_won',
    qualification_status: 'qualified',
    amount: 6200,
    car: 'Lamborghini Huracan',
    assigned: true,
    unread: false,
    reply_state: 'replied',
    customer_text: 'A friend recommended Fleexa. I need the Huracan.'
  },
  {
    key: 'samir-telegram-unassigned',
    days_ago: 2,
    name: 'Samir Khan',
    phone: '+971500000306',
    email: 'stage3.samir@fleexa.local',
    source_key: 'telegram_ads',
    origin_key: 'telegram_bot',
    stage_slug: 'in_progress',
    qualification_status: 'pending',
    amount: 900,
    car: 'Ford Mustang',
    assigned: false,
    unread: true,
    reply_state: 'waiting_for_reply',
    customer_text: 'Telegram promo led me here. Is Mustang free tonight?'
  },
  {
    key: 'elena-meta-lost-license',
    days_ago: 1,
    name: 'Elena Petrova',
    phone: '+971500000307',
    email: 'stage3.elena@fleexa.local',
    source_key: 'meta_ads',
    origin_key: 'facebook',
    stage_slug: 'closed_lost',
    qualification_status: 'unqualified',
    lost_reason_label: 'No valid license',
    amount: 0,
    car: 'Mercedes G63',
    assigned: true,
    unread: false,
    reply_state: 'replied',
    customer_text: 'Facebook ad showed G63. I do not have a local license.'
  },
  {
    key: 'karim-blogger-lost-reply',
    days_ago: 1,
    name: 'Karim Aziz',
    phone: '+971500000308',
    email: 'stage3.karim@fleexa.local',
    source_key: 'blogger_ugc',
    origin_key: 'instagram',
    stage_slug: 'closed_lost',
    qualification_status: 'qualified',
    lost_reason_label: 'No reply after quote',
    amount: 0,
    car: 'Ferrari Portofino',
    assigned: true,
    unread: false,
    reply_state: 'replied',
    customer_text: 'Saw the blogger story and want the Ferrari for Friday.'
  },
  {
    key: 'sofia-google-reserved-waiting',
    days_ago: 0,
    name: 'Sofia Marin',
    phone: '+971500000309',
    email: 'stage3.sofia@fleexa.local',
    source_key: 'google_ads',
    origin_key: 'website',
    stage_slug: 'reserved',
    qualification_status: 'qualified',
    amount: 3600,
    car: 'Porsche Macan',
    assigned: true,
    unread: true,
    reply_state: 'waiting_for_reply',
    customer_text: 'I reserved Macan online. Can I change pickup time?'
  },
  {
    key: 'victor-dubizzle-lost-budget',
    days_ago: 0,
    name: 'Victor Stone',
    phone: '+971500000310',
    email: 'stage3.victor@fleexa.local',
    source_key: 'dubizzle',
    origin_key: 'call',
    stage_slug: 'closed_lost',
    qualification_status: 'unqualified',
    lost_reason_label: 'Budget mismatch',
    amount: 0,
    car: 'Cadillac Escalade',
    assigned: false,
    unread: true,
    reply_state: 'waiting_for_reply',
    customer_text: 'Dubizzle listing is above my budget. Any discount?'
  }
].freeze

def abort_with(message)
  warn "ERROR: #{message}"
  exit 1
end

def require_model!(name)
  abort_with("#{name} is missing. Apply the CRM/Manager patch chain first.") unless Object.const_defined?(name)
end

def selected_account
  account_id = ENV['FLEEXA_MANAGER_DEMO_ACCOUNT_ID'].presence || ENV['ACCOUNT_ID'].presence
  return Account.find(account_id) if account_id.present?

  Account.order(:id).first || abort_with('No account exists. Seed Chatwoot first.')
end

def selected_manager(account)
  requested_email = ENV['FLEEXA_MANAGER_DEMO_EMAIL'].presence
  requested_password = ENV['FLEEXA_MANAGER_DEMO_PASSWORD'].presence
  preferred_emails = [
    requested_email,
    'manager-ui-smoke@example.com',
    'stage3-manager-smoke@fleexa.local'
  ].compact
  user = preferred_emails.filter_map { |email| User.find_by(email: email) }.first

  if requested_password.present?
    requested_email ||= preferred_emails.first || 'stage3-manager-demo@fleexa.local'
    user ||= User.new(email: requested_email, name: 'Stage 3 Demo Manager')
    user.password = requested_password
    user.password_confirmation = requested_password
    user.confirmed_at ||= Time.current if user.respond_to?(:confirmed_at)
    user.save!
  end

  user ||= account.users.order(:id).first
  abort_with('No manager user exists. Set FLEEXA_MANAGER_DEMO_EMAIL and FLEEXA_MANAGER_DEMO_PASSWORD to create a local-only demo user.') if user.blank?

  AccountUser.find_or_create_by!(account: account, user: user) do |membership|
    membership.role = :administrator
    membership.active_at = Time.current if membership.respond_to?(:active_at=)
  end

  user
end

def demo_inbox(account, manager)
  inbox = account.inboxes.order(:id).first

  if inbox.blank?
    channel = Channel::WebWidget.create!(
      account: account,
      website_url: 'https://stage3-demo.fleexa.local',
      widget_color: '#0EA5A0'
    )
    inbox = Inbox.create!(account: account, channel: channel, name: 'Fleexa Manager Stage 3 Demo')
  end

  InboxMember.find_or_create_by!(inbox: inbox, user: manager) if Object.const_defined?(:InboxMember)
  inbox
end

def merge_attribution_settings!(account)
  settings = (account.settings || {}).deep_dup
  config = (settings[MARKETING_CONFIG_KEY] || {}).deep_dup
  config['traffic_sources'] = merge_items(config['traffic_sources'], TRAFFIC_SOURCES)
  config['lead_origins'] = merge_items(config['lead_origins'], LEAD_ORIGINS)
  settings[MARKETING_CONFIG_KEY] = config
  account.update!(settings: settings)
end

def merge_items(existing_items, required_items)
  existing = Array(existing_items).filter_map do |item|
    item.respond_to?(:to_h) ? item.to_h.stringify_keys : nil
  end
  by_key = existing.index_by { |item| item['key'].to_s }

  required_items.each do |item|
    by_key[item[:key]] ||= {
      'key' => item[:key],
      'label' => item[:label],
      'is_active' => true,
      'sort_order' => by_key.length + 1
    }
  end

  by_key.values
end

def ensure_stages!(account)
  taken_positions = CrmPipelineStage.for_account(account.id).pluck(:position).compact.to_set

  STAGES.each do |attrs|
    stage = CrmPipelineStage.for_account(account.id).find_or_initialize_by(slug: attrs[:slug])
    next unless stage.new_record?

    position = attrs[:position]
    position += 1 while taken_positions.include?(position)
    taken_positions.add(position)

    stage.assign_attributes(
      name: attrs[:name],
      color: attrs[:color],
      position: position,
      is_system: true,
      fleet_status_trigger: attrs[:fleet_status_trigger]
    )
    stage.save!
  end

  CrmPipelineStage.for_account(account.id).index_by(&:slug)
end

def ensure_loss_reasons!(account)
  LOSS_REASONS.each_with_index do |label, index|
    CrmLossReasonOption.where(account_id: account.id, label: label).first_or_create!(
      position: index + 1,
      is_active: true
    )
  end
end

def clean_previous_demo!(account)
  demo_conversation_ids = Conversation.where(account_id: account.id)
                                      .where('custom_attributes ->> ? = ?', MARKER, 'true')
                                      .pluck(:id)
  demo_contact_ids = Contact.where(account_id: account.id)
                            .where('custom_attributes ->> ? = ?', MARKER, 'true')
                            .pluck(:id)

  CrmDeal.where(account_id: account.id)
         .where('custom_attributes ->> ? = ?', MARKER, 'true')
         .delete_all
  Message.where(account_id: account.id, conversation_id: demo_conversation_ids).delete_all if demo_conversation_ids.any?
  Conversation.where(id: demo_conversation_ids).delete_all if demo_conversation_ids.any?
  ContactInbox.where(contact_id: demo_contact_ids).delete_all if demo_contact_ids.any?
  Contact.where(id: demo_contact_ids).delete_all if demo_contact_ids.any?
end

def demo_attributes(row)
  traffic = TRAFFIC_SOURCES.find { |source| source[:key] == row[:source_key] }
  origin = LEAD_ORIGINS.find { |item| item[:key] == row[:origin_key] }
  lost_label = row[:lost_reason_label]

  {
    MARKER => 'true',
    'traffic_source_key' => row[:source_key],
    'traffic_source_label' => traffic&.fetch(:label),
    'lead_origin_key' => row[:origin_key],
    'lead_origin_label' => origin&.fetch(:label),
    'source_detection_method' => 'manual',
    'source_confidence' => 'manual',
    'qualification_status' => row[:qualification_status],
    'lost_reason_key' => lost_label.present? ? attribution_key(lost_label) : nil,
    'lost_reason_label' => lost_label,
    'needs_source_clarification' => false
  }.compact
end

def attribution_key(value)
  value.to_s
       .strip
       .downcase
       .gsub(/[^a-z0-9]+/, '_')
       .gsub(/\A_+|_+\z/, '')
end

def create_contact!(account, row, at)
  Contact.create!(
    account_id: account.id,
    identifier: "stage3-demo-#{row[:key]}",
    name: row[:name],
    phone_number: row[:phone],
    email: row[:email],
    custom_attributes: demo_attributes(row)
  ).tap do |contact|
    contact.update_columns(created_at: at, updated_at: at, last_activity_at: at)
  end
end

def create_conversation!(account, inbox, manager, contact, row, at)
  contact_inbox = ContactInbox.create!(
    contact: contact,
    inbox: inbox,
    source_id: "fleexa-stage3-demo-#{row[:key]}"
  )

  conversation = Conversation.create!(
    account: account,
    inbox: inbox,
    contact: contact,
    contact_inbox: contact_inbox,
    identifier: "fleexa-stage3-demo-#{row[:key]}",
    assignee: row[:assigned] ? manager : nil,
    status: :open,
    custom_attributes: demo_attributes(row),
    additional_attributes: { source: row[:origin_key] },
    first_reply_created_at: row[:reply_state] == 'replied' ? at + 20.minutes : nil,
    last_activity_at: at + 2.hours
  )

  create_message!(
    account: account,
    inbox: inbox,
    conversation: conversation,
    sender: contact,
    message_type: :incoming,
    content: row[:customer_text],
    at: at + 5.minutes
  )

  if row[:reply_state] == 'replied'
    create_message!(
      account: account,
      inbox: inbox,
      conversation: conversation,
      sender: manager,
      message_type: :outgoing,
      content: "Thanks #{contact.name.split.first}, I checked this and updated your deal.",
      at: at + 40.minutes
    )
    last_activity_at = at + 40.minutes
  else
    if row[:assigned]
      create_message!(
        account: account,
        inbox: inbox,
        conversation: conversation,
        sender: manager,
        message_type: :outgoing,
        content: 'I am checking availability now.',
        at: at + 20.minutes
      )
      create_message!(
        account: account,
        inbox: inbox,
        conversation: conversation,
        sender: contact,
        message_type: :incoming,
        content: 'Any update?',
        at: at + 70.minutes
      )
      last_activity_at = at + 70.minutes
    else
      last_activity_at = at + 5.minutes
    end
  end

  agent_seen_at = if row[:unread]
                    at
                  else
                    last_activity_at + 5.minutes
                  end

  conversation.update_columns(
    created_at: at,
    updated_at: last_activity_at,
    last_activity_at: last_activity_at,
    assignee_id: row[:assigned] ? manager.id : nil,
    assignee_agent_bot_id: nil,
    agent_last_seen_at: agent_seen_at,
    assignee_last_seen_at: agent_seen_at
  )
  contact_inbox.update_columns(created_at: at, updated_at: last_activity_at)
  conversation
end

def create_message!(account:, inbox:, conversation:, sender:, message_type:, content:, at:)
  Message.create!(
    account: account,
    inbox: inbox,
    conversation: conversation,
    sender: sender,
    message_type: message_type,
    content_type: :text,
    status: :sent,
    private: false,
    content: content,
    created_at: at,
    updated_at: at
  )
end

def create_deal!(account, stages, manager, contact, conversation, row, at)
  stage = stages.fetch(row[:stage_slug]) do
    abort_with("Missing stage #{row[:stage_slug]}. Run ACCOUNT_ID=#{account.id} make crm-seed first.")
  end

  CrmDeal.create!(
    account: account,
    stage: stage,
    contact: contact,
    conversation: conversation,
    assigned_to: row[:assigned] ? manager.id : nil,
    title: "#{row[:name]} - #{row[:car]}",
    car_model: row[:car],
    client_phone: row[:phone],
    amount: row[:amount],
    debt_amount: 0,
    fleet_sync_status: 'none',
    custom_attributes: demo_attributes(row).merge('demo_review_notes' => 'Local Stage 3 review data')
  ).tap do |deal|
    deal.update_columns(created_at: at, updated_at: at + 1.hour)
  end
end

require_model!('CrmPipelineStage')
require_model!('CrmDeal')
require_model!('CrmLossReasonOption')

account = selected_account
manager = selected_manager(account)
inbox = demo_inbox(account, manager)

merge_attribution_settings!(account)
stages = ensure_stages!(account)
ensure_loss_reasons!(account)
clean_previous_demo!(account)

DEMO_ROWS.each_with_index do |row, index|
  at = (Time.zone.now - row[:days_ago].days).change(hour: 9 + (index % 8), min: 10 + (index % 5) * 7, sec: 0)
  contact = create_contact!(account, row, at)
  conversation = create_conversation!(account, inbox, manager, contact, row, at)
  create_deal!(account, stages, manager, contact, conversation, row, at)
end

demo_conversations = Conversation.where(account_id: account.id).where('custom_attributes ->> ? = ?', MARKER, 'true')
demo_deals = CrmDeal.where(account_id: account.id).where('custom_attributes ->> ? = ?', MARKER, 'true')

summary = {
  account_id: account.id,
  account_name: account.name,
  manager_email: manager.email,
  inbox_id: inbox.id,
  demo_conversations: demo_conversations.count,
  assigned_conversations: demo_conversations.where.not(assignee_id: nil).count,
  unassigned_conversations: demo_conversations.where(assignee_id: nil).count,
  unread_conversations: demo_conversations.select { |conversation| conversation.unread_incoming_messages.count.positive? }.count,
  waiting_for_reply_conversations: demo_conversations.select do |conversation|
    incoming_at = conversation.messages.incoming.where(private: false).maximum(:created_at)
    outgoing_at = conversation.messages.outgoing.where(private: false).maximum(:created_at)
    incoming_at.present? && (outgoing_at.blank? || incoming_at > outgoing_at)
  end.count,
  demo_deals: demo_deals.count,
  deals_by_stage: demo_deals.joins(:stage).group('crm_pipeline_stages.slug').count,
  qualified_deals: demo_deals.where("custom_attributes ->> 'qualification_status' = 'qualified'").count,
  unqualified_deals: demo_deals.where("custom_attributes ->> 'qualification_status' = 'unqualified'").count,
  lost_reasons: CrmLossReasonOption.for_account(account.id).active.pluck(:label)
}

puts JSON.pretty_generate(summary)
