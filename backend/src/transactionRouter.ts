import express from "express";
import { createClient } from "@supabase/supabase-js";
import { sendReceiptEmail } from "./mailer";

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const getCustomerName = async (email: string) => {
    const { data } = await supabase
        .from("users")
        .select("name")
        .eq("email", email)
        .single();
    return data?.name || "Customer";
};

router.post("/send-receipt-email", async (req, res) => {
    const { email, name, txData } = req.body;
    try {
        if (!email || !txData) {
            return res.status(400).json({ success: false, error: "Missing email or transaction data" });
        }
        await sendReceiptEmail(email, name || "Customer", txData);
        res.status(200).json({ success: true, message: "Receipt sent successfully" });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post("/subscribe", async (req, res) => {
    const { transaction_id, payer_email, amount, plan_type } = req.body;
    try {
        const now = new Date();
        let baseDate = now;

        const { data: currentSub } = await supabase
            .from("transactions")
            .select("expiry_date")
            .eq("payer_email", payer_email)
            .eq("variant", "subscription")
            .gt("expiry_date", now.toISOString())
            .order("expiry_date", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (currentSub && currentSub.expiry_date) {
            baseDate = new Date(currentSub.expiry_date);
        }

        const newExpiry = new Date(baseDate);
        
        let daysToAdd = 30; 
        if (plan_type === 'daily') daysToAdd = 1;
        else if (plan_type === 'weekly') daysToAdd = 7;
        else if (plan_type === 'monthly') daysToAdd = 30;
        else if (plan_type === 'yearly') daysToAdd = 365;

        newExpiry.setDate(newExpiry.getDate() + daysToAdd);

        const { data: txData, error: txError } = await supabase
            .from("transactions")
            .insert([{
                transaction_id: String(transaction_id),
                payer_email: String(payer_email),
                sound_id: "xxxx",
                amount: Number(amount),
                currency: "USD",
                payment_status: "completed",
                variant: "subscription",
                expiry_date: newExpiry.toISOString()
            }])
            .select();

        if (txError) {
            return res.status(400).json({ success: false, error: txError.message });
        }

        const total = Number(amount);
        const distribution = [
            { name: "Heritage Developers", type: "platform", share: total * 0.80 },
            { name: "Wits", type: "funder", share: total * 0.20 }
        ];

        for (const item of distribution) {
            if (item.name && item.name !== "undefined" && item.name !== "") {
                await supabase.rpc('update_holder_balance', {
                    h_name: item.name,
                    h_type: item.type,
                    h_amount: Number(item.share.toFixed(2))
                });
            }
        }

        const userName = await getCustomerName(payer_email);
        await sendReceiptEmail(payer_email, userName, txData[0]);

        res.status(201).json({ success: true, data: txData[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post("/insert", async (req, res) => {
    const { transaction_id, payer_email, sound_id, amount, variant } = req.body;
    try {
        let actualContributor = "System";
        let actualCommunity = "General";

        if (sound_id !== "xxxx") {
            if (variant === "fused") {
                const { data: fusedData } = await supabase
                    .from("fused_tracks")
                    .select("user_mail, community")
                    .eq("sound_id", String(sound_id))
                    .single();
                if (fusedData) {
                    actualContributor = fusedData.user_mail;
                    actualCommunity = fusedData.community;
                }
            } else {
                const { data: trackData } = await supabase
                    .from("tracks")
                    .select("contributor, community")
                    .eq("sound_id", String(sound_id))
                    .single();
                if (trackData) {
                    actualContributor = trackData.contributor;
                    actualCommunity = trackData.community;
                }
            }
        }

        const { data: txData, error: txError } = await supabase
            .from("transactions")
            .insert([{
                transaction_id: String(transaction_id),
                payer_email: String(payer_email),
                sound_id: String(sound_id),
                amount: Number(amount),
                currency: "USD",
                payment_status: "completed",
                variant: String(variant),
                expiry_date: null
            }])
            .select();

        if (txError) {
            return res.status(400).json({ success: false, error: txError.message });
        }

        const total = Number(amount);
        const distribution = (sound_id === "xxxx") 
            ? [
                { name: "Heritage Developers", type: "platform", share: total * 0.80 },
                { name: "Wits", type: "funder", share: total * 0.20 }
              ]
            : [
                { name: "Heritage Developers", type: "platform", share: total * 0.50 },
                { name: "Wits", type: "funder", share: total * 0.20 },
                { name: actualCommunity, type: "community", share: total * 0.20 },
                { name: actualContributor, type: "uploader", share: total * 0.10 }
              ];

        for (const item of distribution) {
            if (item.name && item.name !== "undefined" && item.name !== "") {
                await supabase.rpc('update_holder_balance', {
                    h_name: item.name,
                    h_type: item.type,
                    h_amount: Number(item.share.toFixed(2))
                });
            }
        }

        const userName = await getCustomerName(payer_email);
        await sendReceiptEmail(payer_email, userName, txData[0]);

        res.status(201).json({ success: true, data: txData[0] });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post("/update-withdraw-account", async (req, res) => {
    const { email, withdraw_account, account_type } = req.body;
    try {
        const { data, error } = await supabase
            .from("holder_balances")
            .update({ 
                withdraw_account: String(withdraw_account), 
                account_type: String(account_type) 
            })
            .eq("holder_name", email);

        if (error) throw error;
        res.status(200).json({ success: true, message: "Withdrawal account updated" });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post("/process-withdrawal", async (req, res) => {
    const { email, amount } = req.body;
    try {
        const amountNum = Number(amount);
        if (amountNum <= 0) {
            return res.status(400).json({ success: false, error: "Amount must be greater than zero" });
        }

        const { data: currentRecord, error: fetchError } = await supabase
            .from("holder_balances")
            .select("balance")
            .eq("holder_name", email)
            .maybeSingle();

        if (fetchError || !currentRecord) {
            return res.status(404).json({ success: false, error: "Account record not found" });
        }

        if (currentRecord.balance < amountNum) {
            return res.status(400).json({ success: false, error: "Insufficient balance for this withdrawal" });
        }

        const { error: updateError } = await supabase
            .from("holder_balances")
            .update({ balance: currentRecord.balance - amountNum })
            .eq("holder_name", email);

        if (updateError) throw updateError;

        res.status(200).json({ success: true, message: "Withdrawal processed successfully" });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get("/check-subscription/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from("transactions")
            .select("expiry_date")
            .eq("payer_email", email)
            .eq("variant", "subscription")
            .gt("expiry_date", now)
            .order("expiry_date", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        res.status(200).json({ 
            success: true, 
            isSubscribed: !!data, 
            expiryDate: data ? data.expiry_date : null 
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get("/all", async (req, res) => {
    try {
        const { data: txs, error: txErr } = await supabase
            .from("transactions")
            .select("*")
            .order("created_at", { ascending: false });
        if (txErr) throw txErr;

        const { data: users } = await supabase.from("users").select("email, name");
        const { data: hTracks } = await supabase.from("tracks").select("sound_id, title");
        const { data: fTracks } = await supabase.from("fused_tracks").select("sound_id, heritage_sound, modern_sound");

        const formattedData = (txs || []).map((tx) => {
            const userMatch = users?.find(u => u.email === tx.payer_email);
            let category = "HERITAGE SOUND";
            let title = "Heritage Track";
            let formattedExpiry = null;

            if (tx.variant === "subscription" || tx.sound_id === "xxxx") {
                category = "SUBSCRIPTION";
                title = "Premium Plan";
                if (tx.expiry_date) {
                    const dateObj = new Date(tx.expiry_date);
                    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    formattedExpiry = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
                }
            } else if (tx.variant === "fused") {
                category = "FUSED SOUND";
                const trackMatch = fTracks?.find(t => String(t.sound_id) === String(tx.sound_id));
                title = trackMatch ? `${trackMatch.heritage_sound} - ${trackMatch.modern_sound}` : "Fused Track";
            } else {
                const trackMatch = hTracks?.find(t => String(t.sound_id) === String(tx.sound_id));
                title = trackMatch ? trackMatch.title : "Heritage Track";
            }

            return {
                id: tx.id,
                display_id: tx.transaction_id,
                created_at: tx.created_at,
                amount: tx.amount,
                payer_email: tx.payer_email,
                payer_name: userMatch ? userMatch.name : "Customer", 
                sound_id: tx.sound_id,
                category: category,
                track_title: title,
                expiry_date: formattedExpiry
            };
        });

        res.status(200).json({ success: true, data: formattedData });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get("/get-balance/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const { data, error } = await supabase
            .from("holder_balances")
            .select("balance")
            .eq("holder_name", email)
            .maybeSingle();
        if (error) throw error;
        res.status(200).json({ success: true, balance: data ? data.balance : 0 });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get("/holder-balances", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("holder_balances")
            .select("*");
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get("/platform-balances", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("holder_balances")
            .select("*")
            .in("holder_type", ["platform", "funder"]);
        if (error) throw error;
        res.status(200).json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;