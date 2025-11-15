<script setup>
import { onBeforeMount, ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore, useSessionStore, useGlobalStore } from '@/stores';
import { RecaptchaV2 } from 'vue3-recaptcha-v2';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const sessionStore = useSessionStore();
const company = sessionStore.customerCompany;
const globalStore = useGlobalStore();

const loading = ref(false);
const showEula = ref(false);
const showPrivacy = ref(false);
const acceptPolicies = ref(false);
const credentials = ref({
    email: route.query?.email || '',
    password: '',
    password_confirmation: ''
});

const rules = ref({
    minLength: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false
});

onBeforeMount(() => {
    globalStore.clearErrors();
});

const validatePassword = () => {
    const password = credentials.value.password;

    rules.value.minLength = password.length >= 8;
    rules.value.uppercase = /[A-Z]/.test(password);
    rules.value.lowercase = /[a-z]/.test(password);
    rules.value.number = /[0-9]/.test(password);
    rules.value.symbol = /[@$!%*#?&]/.test(password);
};

const isPasswordValid = computed(
    () =>
        rules.value.minLength &&
        rules.value.uppercase &&
        rules.value.lowercase &&
        rules.value.number &&
        rules.value.symbol
);

const register = async () => {
    if (!recaptchaToken.value) {
        globalStore.showError('reCAPTCHA', 'Please complete the reCAPTCHA');
        return;
    }
    try {
        loading.value = true;
        await authStore.register(credentials.value);

        const url = 'Dashboard';
        router.push(url);
    } catch (e) {
        // Handle error
    } finally {
        loading.value = false;
    }
};

// recaptcha
const recaptchaToken = ref('');
const handleErrorCallback = () => {
    globalStore.showError(
        'reCAPTCHA',
        'Captcha failed to load. Please refresh.'
    );
};
const handleExpiredCallback = () => {
    recaptchaToken.value = '';
    globalStore.showError('reCAPTCHA', 'Captcha expired, Please refresh.');
};
const handleLoadCallback = (token) => {
    recaptchaToken.value = token;
};
</script>

<template>
    <div>
        <div class="text-center">
            <img
                :src="company?.logo_url"
                :alt="company?.name"
                class="mx-auto company-logo mb-2"
            />
            <h2 class="text-lg !text-gray-600 font-bold mb-2">
                {{ company?.name }}
            </h2>
            <h4 class="text-3xl font-bold mb-2">Customer Portal</h4>
            <p class="text-gray-700 mb-12">Create your account</p>
        </div>
        <form @submit.prevent="register">
            <div class="grid">
                <div class="mb-6 col-span-12">
                    <label class="block mb-2" for="email"> Email </label>
                    <InputField
                        variant="text"
                        id="email"
                        v-model="credentials.email"
                        class="w-full"
                    />
                </div>

                <div class="mb-4 col-span-12">
                    <label class="block mb-2" for="password"> Password </label>
                    <InputField
                        @input="validatePassword"
                        id="password"
                        variant="password"
                        v-model="credentials.password"
                        class="w-full"
                        inputClass="w-full"
                        toggleMask
                        :feedback="false"
                    />
                </div>

                <div class="mb-4 col-span-12">
                    <label class="block mb-2" for="password_confirmation">
                        Confirm Password
                    </label>
                    <InputField
                        @input="validatePassword"
                        id="password_confirmation"
                        variant="password"
                        v-model="credentials.password_confirmation"
                        class="w-full"
                        inputClass="w-full"
                        toggleMask
                        :feedback="false"
                    />
                </div>

                <div class="mb-6 col-span-12 mt-3">
                    <label class="font-semibold mb-4 block"
                        >Password must contain the following:</label
                    >
                    <div class="space-y-1">
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.minLength,
                                    invalid: !rules.minLength
                                }
                            ]"
                        >
                            <span class="pl-3">At least 8 characters</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.uppercase,
                                    invalid: !rules.uppercase
                                }
                            ]"
                        >
                            <span class="pl-3">One upper case letter</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                {
                                    valid: rules.lowercase,
                                    invalid: !rules.lowercase
                                }
                            ]"
                        >
                            <span class="pl-3">One lower case letter</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                { valid: rules.number, invalid: !rules.number }
                            ]"
                        >
                            <span class="pl-3">At least one number</span>
                        </div>
                        <div
                            :class="[
                                'font-medium !mb-2',
                                { valid: rules.symbol, invalid: !rules.symbol }
                            ]"
                        >
                            <span class="pl-3"
                                >At least one symbol @$!%*#?&</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <div class="pb-5">
                <RecaptchaV2
                    @error-callback="handleErrorCallback"
                    @expired-callback="handleExpiredCallback"
                    @load-callback="handleLoadCallback"
                />
            </div>

            <div class="flex mb-2">
                <InputField
                    class="mt-1"
                    variant="checkbox"
                    v-model="acceptPolicies"
                    binary
                    inputId="remember"
                />
                <label class="ml-3 text-sm font-base text-gray-500 leading-6">
                    By creating an account, you agree to our
                    <span
                        @click="showEula = true"
                        class="font-semibold cursor-pointer primary-text"
                    >
                        End-User License Agreement
                    </span>
                    and
                    <span
                        @click="showPrivacy = true"
                        class="font-semibold cursor-pointer primary-text"
                    >
                        Privacy Policy
                    </span>
                </label>
            </div>

            <Button
                class="w-full left-loading mt-1"
                label="Create Account"
                :disabled="
                    loading ||
                    !isPasswordValid ||
                    !recaptchaToken ||
                    !acceptPolicies
                "
                :loading="loading"
                type="submit"
            />

            <router-link
                class="primary-text flex justify-center mt-6"
                :to="{
                    name: 'Login'
                }"
            >
                Already have an account? Sign in
            </router-link>
        </form>
    </div>

    <!-- EULA Dialog -->
    <Dialog
        v-model:visible="showEula"
        modal
        header="End-User License Agreement"
        :style="{ width: '50vw' }"
    >
        <div class="leading-6 text-gray-700 space-y-4 max-h-[65vh] pr-2">
            <p><strong>Last Updated:</strong> November 13, 2025</p>

            <h4 class="font-semibold mt-4">1. Introduction</h4>
            <p>
                Welcome to ServiCore. THIS IS TEST. ("we," "our," or "us"). We
                are committed to protecting your personal information and your
                right to privacy. This Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you use our
                service management platform.
            </p>

            <h4 class="font-semibold mt-4">2. Information We Collect</h4>

            <h5 class="font-medium mt-2">2.1 Personal Information</h5>
            <p>
                We collect personal information that you voluntarily provide to
                us when you register on the platform, express an interest in
                obtaining information about us or our products and services, or
                otherwise contact us. The personal information we collect may
                include:
            </p>
            <ul class="list-disc pl-6">
                <li>
                    Name and contact data (email address, phone number, postal
                    address)
                </li>
                <li>
                    Credentials (passwords, password hints, and similar security
                    information)
                </li>
                <li>
                    Payment information (credit card numbers, billing address)
                </li>
                <li>Company information (business name, industry, size)</li>
                <li>Professional information (job title, department)</li>
            </ul>

            <h5 class="font-medium mt-2">
                2.2 Automatically Collected Information
            </h5>
            <p>
                When you access our platform, we automatically collect certain
                information about your device, including:
            </p>
            <ul class="list-disc pl-6">
                <li>
                    Device and browser information (IP address, browser type,
                    operating system)
                </li>
                <li>
                    Usage data (pages visited, time spent, clicks, navigation
                    paths)
                </li>
                <li>
                    Location data (general geographic location based on IP
                    address)
                </li>
                <li>Cookies and similar tracking technologies</li>
            </ul>

            <h5 class="font-medium mt-2">2.3 Time-Based Personalization</h5>
            <p>
                When you submit a contact request through our website, we use
                your browser's local time to personalize our thank you message
                based on the time of day (morning, afternoon, evening, or
                night). This creates a more contextual and personal interaction.
            </p>
            <ul class="list-disc pl-6">
                <li>Derived from your device's local time settings</li>
                <li>Used only to generate an appropriate greeting</li>
                <li>Not stored in our database</li>
                <li>
                    Processed in real-time and immediately discarded after
                    generating the personalized message
                </li>
            </ul>
            <p>
                This processing is based on our legitimate interest in providing
                a more personalized and engaging user experience. No sensitive
                timing data is retained beyond the immediate interaction.
            </p>

            <h4 class="font-semibold mt-4">3. How We Use Your Information</h4>
            <ul class="list-disc pl-6">
                <li>
                    Service Delivery: To provide, maintain, and improve our
                    platform services
                </li>
                <li>
                    Account Management: To manage your account and provide
                    customer support
                </li>
                <li>
                    Communication: To send you technical notices, updates,
                    security alerts, and administrative messages
                </li>
                <li>
                    Marketing: To send promotional communications (with your
                    consent where required)
                </li>
                <li>
                    Analytics: To understand how users interact with our
                    platform and improve user experience
                </li>
                <li>
                    Security: To detect, prevent, and address technical issues
                    and fraudulent activity
                </li>
                <li>
                    Legal Compliance: To comply with applicable laws,
                    regulations, and legal processes
                </li>
            </ul>

            <h4 class="font-semibold mt-4">
                4. Information Sharing and Disclosure
            </h4>
            <p>We may share your information in the following circumstances:</p>
            <ul class="list-disc pl-6">
                <li>
                    Service Providers: With third-party vendors who perform
                    services on our behalf
                </li>
                <li>
                    Business Transfers: In connection with a merger,
                    acquisition, or sale of assets
                </li>
                <li>
                    Legal Requirements: When required by law or to protect our
                    rights and safety
                </li>
                <li>
                    With Your Consent: When you have given us explicit
                    permission to share your information
                </li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>

            <h4 class="font-semibold mt-4">5. Data Security</h4>
            <ul class="list-disc pl-6">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection and privacy</li>
                <li>Incident response procedures</li>
            </ul>
            <p>
                However, no method of transmission over the internet or
                electronic storage is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
            </p>

            <h4 class="font-semibold mt-4">6. Data Retention</h4>
            <p>
                We retain your personal information for as long as necessary to
                fulfill the purposes outlined in this Privacy Policy, unless a
                longer retention period is required by law. When we no longer
                need your information, we will securely delete or anonymize it.
            </p>

            <h4 class="font-semibold mt-4">7. Your Privacy Rights</h4>
            <ul class="list-disc pl-6">
                <li>
                    Access, Correction, Deletion, Portability, Objection,
                    Restriction, Withdraw Consent
                </li>
            </ul>

            <h4 class="font-semibold mt-4">
                8. Cookies and Tracking Technologies
            </h4>
            <p>
                We use cookies and similar tracking technologies to collect and
                store information. You can control cookies through your browser
                settings.
            </p>

            <h4 class="font-semibold mt-4">9. Third-Party Links</h4>
            <p>
                Our platform may contain links to third-party websites. We are
                not responsible for their privacy practices.
            </p>

            <h4 class="font-semibold mt-4">10. Children's Privacy</h4>
            <p>
                Our platform is not intended for children under 16. We do not
                knowingly collect information from them.
            </p>

            <h4 class="font-semibold mt-4">11. International Data Transfers</h4>
            <p>
                Your information may be transferred to and processed in other
                countries. We ensure appropriate safeguards are in place.
            </p>

            <h4 class="font-semibold mt-4">
                12. Changes to This Privacy Policy
            </h4>
            <p>
                We may update this Privacy Policy periodically and will notify
                you by posting an updated version on this page.
            </p>

            <h4 class="font-semibold mt-4">13. Contact Us</h4>
            <p>
                ServiCore<br />
                Email: privacy@servicore.io<br />
                Phone: +1 (555) 123-4567<br />
                Address: 123 Business Street, Suite 100, City, State 12345
            </p>

            <h4 class="font-semibold mt-4">
                14. Specific Jurisdictional Rights
            </h4>

            <h5 class="font-medium mt-2">14.1 European Economic Area (EEA)</h5>
            <p>
                You have rights under the GDPR, including the right to lodge a
                complaint with a supervisory authority.
            </p>

            <h5 class="font-medium mt-2">14.2 California Residents</h5>
            <p>
                Under the CCPA, California residents have the right to know what
                personal information is collected and to opt out of its sale.
            </p>

            <h5 class="font-medium mt-2">14.3 Other Jurisdictions</h5>
            <p>
                We comply with privacy laws in all jurisdictions where we
                operate. Contact us with any questions regarding your rights.
            </p>
        </div>
        <template #footer>
            <Button label="Close" @click="showEula = false" />
        </template>
    </Dialog>

    <!-- Privacy Policy Dialog -->
    <Dialog
        v-model:visible="showPrivacy"
        modal
        header="Privacy Policy"
        :style="{ width: '50vw', maxHeight: '80vh' }"
    >
        <div class="leading-6 text-gray-700 space-y-4 max-h-[65vh] pr-2">
            <p><strong>Last Updated:</strong> November 13, 2025</p>

            <h4 class="font-semibold mt-4">1. Introduction</h4>
            <p>
                Welcome to ServiCore. THIS IS TEST. ("we," "our," or "us"). We
                are committed to protecting your personal information and your
                right to privacy. This Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you use our
                service management platform.
            </p>

            <h4 class="font-semibold mt-4">2. Information We Collect</h4>

            <h5 class="font-medium mt-2">2.1 Personal Information</h5>
            <p>
                We collect personal information that you voluntarily provide to
                us when you register on the platform, express an interest in
                obtaining information about us or our products and services, or
                otherwise contact us. The personal information we collect may
                include:
            </p>
            <ul class="list-disc pl-6">
                <li>
                    Name and contact data (email address, phone number, postal
                    address)
                </li>
                <li>
                    Credentials (passwords, password hints, and similar security
                    information)
                </li>
                <li>
                    Payment information (credit card numbers, billing address)
                </li>
                <li>Company information (business name, industry, size)</li>
                <li>Professional information (job title, department)</li>
            </ul>

            <h5 class="font-medium mt-2">
                2.2 Automatically Collected Information
            </h5>
            <p>
                When you access our platform, we automatically collect certain
                information about your device, including:
            </p>
            <ul class="list-disc pl-6">
                <li>
                    Device and browser information (IP address, browser type,
                    operating system)
                </li>
                <li>
                    Usage data (pages visited, time spent, clicks, navigation
                    paths)
                </li>
                <li>
                    Location data (general geographic location based on IP
                    address)
                </li>
                <li>Cookies and similar tracking technologies</li>
            </ul>

            <h5 class="font-medium mt-2">2.3 Time-Based Personalization</h5>
            <p>
                When you submit a contact request through our website, we use
                your browser's local time to personalize our thank you message
                based on the time of day (morning, afternoon, evening, or
                night). This creates a more contextual and personal interaction.
            </p>
            <ul class="list-disc pl-6">
                <li>Derived from your device's local time settings</li>
                <li>Used only to generate an appropriate greeting</li>
                <li>Not stored in our database</li>
                <li>
                    Processed in real-time and immediately discarded after
                    generating the personalized message
                </li>
            </ul>
            <p>
                This processing is based on our legitimate interest in providing
                a more personalized and engaging user experience. No sensitive
                timing data is retained beyond the immediate interaction.
            </p>

            <h4 class="font-semibold mt-4">3. How We Use Your Information</h4>
            <ul class="list-disc pl-6">
                <li>
                    Service Delivery: To provide, maintain, and improve our
                    platform services
                </li>
                <li>
                    Account Management: To manage your account and provide
                    customer support
                </li>
                <li>
                    Communication: To send you technical notices, updates,
                    security alerts, and administrative messages
                </li>
                <li>
                    Marketing: To send promotional communications (with your
                    consent where required)
                </li>
                <li>
                    Analytics: To understand how users interact with our
                    platform and improve user experience
                </li>
                <li>
                    Security: To detect, prevent, and address technical issues
                    and fraudulent activity
                </li>
                <li>
                    Legal Compliance: To comply with applicable laws,
                    regulations, and legal processes
                </li>
            </ul>

            <h4 class="font-semibold mt-4">
                4. Information Sharing and Disclosure
            </h4>
            <p>We may share your information in the following circumstances:</p>
            <ul class="list-disc pl-6">
                <li>
                    Service Providers: With third-party vendors who perform
                    services on our behalf
                </li>
                <li>
                    Business Transfers: In connection with a merger,
                    acquisition, or sale of assets
                </li>
                <li>
                    Legal Requirements: When required by law or to protect our
                    rights and safety
                </li>
                <li>
                    With Your Consent: When you have given us explicit
                    permission to share your information
                </li>
            </ul>
            <p>We do not sell your personal information to third parties.</p>

            <h4 class="font-semibold mt-4">5. Data Security</h4>
            <ul class="list-disc pl-6">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection and privacy</li>
                <li>Incident response procedures</li>
            </ul>
            <p>
                However, no method of transmission over the internet or
                electronic storage is 100% secure. While we strive to protect
                your information, we cannot guarantee absolute security.
            </p>

            <h4 class="font-semibold mt-4">6. Data Retention</h4>
            <p>
                We retain your personal information for as long as necessary to
                fulfill the purposes outlined in this Privacy Policy, unless a
                longer retention period is required by law. When we no longer
                need your information, we will securely delete or anonymize it.
            </p>

            <h4 class="font-semibold mt-4">7. Your Privacy Rights</h4>
            <ul class="list-disc pl-6">
                <li>
                    Access, Correction, Deletion, Portability, Objection,
                    Restriction, Withdraw Consent
                </li>
            </ul>

            <h4 class="font-semibold mt-4">
                8. Cookies and Tracking Technologies
            </h4>
            <p>
                We use cookies and similar tracking technologies to collect and
                store information. You can control cookies through your browser
                settings.
            </p>

            <h4 class="font-semibold mt-4">9. Third-Party Links</h4>
            <p>
                Our platform may contain links to third-party websites. We are
                not responsible for their privacy practices.
            </p>

            <h4 class="font-semibold mt-4">10. Children's Privacy</h4>
            <p>
                Our platform is not intended for children under 16. We do not
                knowingly collect information from them.
            </p>

            <h4 class="font-semibold mt-4">11. International Data Transfers</h4>
            <p>
                Your information may be transferred to and processed in other
                countries. We ensure appropriate safeguards are in place.
            </p>

            <h4 class="font-semibold mt-4">
                12. Changes to This Privacy Policy
            </h4>
            <p>
                We may update this Privacy Policy periodically and will notify
                you by posting an updated version on this page.
            </p>

            <h4 class="font-semibold mt-4">13. Contact Us</h4>
            <p>
                ServiCore<br />
                Email: privacy@servicore.io<br />
                Phone: +1 (555) 123-4567<br />
                Address: 123 Business Street, Suite 100, City, State 12345
            </p>

            <h4 class="font-semibold mt-4">
                14. Specific Jurisdictional Rights
            </h4>

            <h5 class="font-medium mt-2">14.1 European Economic Area (EEA)</h5>
            <p>
                You have rights under the GDPR, including the right to lodge a
                complaint with a supervisory authority.
            </p>

            <h5 class="font-medium mt-2">14.2 California Residents</h5>
            <p>
                Under the CCPA, California residents have the right to know what
                personal information is collected and to opt out of its sale.
            </p>

            <h5 class="font-medium mt-2">14.3 Other Jurisdictions</h5>
            <p>
                We comply with privacy laws in all jurisdictions where we
                operate. Contact us with any questions regarding your rights.
            </p>
        </div>

        <template #footer>
            <Button label="Close" @click="showPrivacy = false" />
        </template>
    </Dialog>
</template>
<style lang="scss" scoped>
.valid,
.valid::before {
    color: #0e4f26;
}
.valid::before {
    content: '\e909';
    font-family: 'PrimeIcons';
}
.invalid,
.invalid::before {
    color: #b32b23;
}
.invalid::before {
    content: '\e90b';
    font-family: 'PrimeIcons';
}
</style>
