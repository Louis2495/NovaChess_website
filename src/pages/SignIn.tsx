import {useEffect} from "react";
import {useOnlineSession,useRecoveryState} from "../lib/online";
import {useApp} from "../lib/context";
import OnlineAccount from '../components/OnlineAccount';
import {PageTitle} from '../components/UI';
export default function SignIn(){const {session}=useOnlineSession(),recovery=useRecoveryState(),{navigate,detail}=useApp();useEffect(()=>{if(session && detail!=="forgot" && !recovery.active && !recovery.checking && !recovery.error)navigate("profile");},[session?.user.id,detail,recovery.active,recovery.checking,recovery.error]);return <div className="sign-in-page"><PageTitle title={recovery.active || recovery.checking || recovery.error?"Reset password":"Sign in"}/><OnlineAccount/></div>;}
